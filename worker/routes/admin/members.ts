// Admin: add, edit, reorder and remove members, set which badges and accessories
// they have, read the log of bios submitted from the site, and approve suggested looks.
import { Hono } from "hono";
import { and, count, desc, eq, gt, max, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../../db/client";
import { bioEdits, lookEdits, memberAccessories, memberBadges, members } from "../../db/schema";
import { ACCESSORIES, checkLook, checkWear, cleanWear } from "../../../src/data/looks";
import { body, isDuplicate, optionalText, orderInput, requiredText, slug } from "./shared";

const fields = {
  name: requiredText(120),
  short: optionalText(60),
  role: z.enum(["leader", "co-leader", "member"]),
  major: requiredText(80),
  year: z.coerce.number().int().min(1).max(7),
  bio: optionalText(600),
  quote: optionalText(160),
  avatar: z.object({
    char: requiredText(30),
    body: requiredText(30),
    // Admins aren't held to badge limits, only to known accessories, one per spot.
    wear: z
      .array(z.string())
      .max(3)
      .default([])
      .superRefine((wear, ctx) => {
        const problem = checkWear(wear);
        if (problem) ctx.addIssue({ code: "custom", message: problem });
      }),
  }),
  badges: z.array(z.string()).default([]),
  // Awarded accessories: only the ones beyond the starter set.
  accessories: z
    .array(z.string())
    .default([])
    .refine((ids) => ids.every((id) => EXTRAS.has(id)), "Unknown accessory"),
};
const EXTRAS = new Set(ACCESSORIES.filter((a) => !a.starter).map((a) => a.id));
const createInput = z.object({ id: slug, ...fields });
const updateInput = z.object(fields);

type Fields = z.infer<typeof updateInput>;
const columns = (m: Fields) => ({
  name: m.name,
  short: m.short,
  role: m.role,
  major: m.major,
  year: m.year,
  bio: m.bio,
  quote: m.quote,
  avatarChar: m.avatar.char,
  avatarBody: m.avatar.body,
  // An extra that isn't (or is no longer) theirs comes off.
  avatarWear: cleanWear(m.avatar.wear, m.accessories),
});

const route = new Hono<AppEnv>();

route.post("/", body(createInput), async (c) => {
  const m = c.req.valid("json");
  const db = getDb(c.env);
  const [{ last }] = await db.select({ last: max(members.position) }).from(members);
  try {
    await db.batch([
      db.insert(members).values({ id: m.id, position: (last ?? -1) + 1, ...columns(m) }),
      ...m.badges.map((badgeId) => db.insert(memberBadges).values({ memberId: m.id, badgeId })),
      ...m.accessories.map((accessoryId) => db.insert(memberAccessories).values({ memberId: m.id, accessoryId })),
    ]);
  } catch (err) {
    if (isDuplicate(err)) return c.json({ error: `The id "${m.id}" is already taken` }, 409);
    throw err;
  }
  return c.json({ ok: true, id: m.id }, 201);
});

route.put("/order", body(orderInput), async (c) => {
  const { ids } = c.req.valid("json");
  const db = getDb(c.env);
  const [first, ...rest] = ids.map((id, position) => db.update(members).set({ position }).where(eq(members.id, id)));
  await db.batch([first, ...rest]);
  return c.json({ ok: true });
});

route.put("/:id", body(updateInput), async (c) => {
  const id = c.req.param("id");
  const m = c.req.valid("json");
  const db = getDb(c.env);
  const [updated] = await db
    .update(members)
    .set({ ...columns(m), updatedAt: sql`(datetime('now'))` })
    .where(eq(members.id, id))
    .returning({ id: members.id });
  if (!updated) return c.json({ error: "Member not found" }, 404);
  // Badges and accessories: replace each whole set, keeping the award date of ones they already had.
  const [had, hadAccessories] = await db.batch([
    db.select().from(memberBadges).where(eq(memberBadges.memberId, id)),
    db.select().from(memberAccessories).where(eq(memberAccessories.memberId, id)),
  ]);
  const keep = new Set(m.badges);
  const hadIds = new Set(had.map((h) => h.badgeId));
  const keepAccessories = new Set(m.accessories);
  const hadAccessoryIds = new Set(hadAccessories.map((h) => h.accessoryId));
  const writes = [
    ...had.filter((h) => !keep.has(h.badgeId)).map((h) => db.delete(memberBadges).where(and(eq(memberBadges.memberId, id), eq(memberBadges.badgeId, h.badgeId)))),
    ...m.badges.filter((b) => !hadIds.has(b)).map((badgeId) => db.insert(memberBadges).values({ memberId: id, badgeId })),
    ...hadAccessories
      .filter((h) => !keepAccessories.has(h.accessoryId))
      .map((h) => db.delete(memberAccessories).where(and(eq(memberAccessories.memberId, id), eq(memberAccessories.accessoryId, h.accessoryId)))),
    ...m.accessories.filter((a) => !hadAccessoryIds.has(a)).map((accessoryId) => db.insert(memberAccessories).values({ memberId: id, accessoryId })),
  ];
  if (writes.length) {
    const [first, ...rest] = writes;
    await db.batch([first, ...rest]);
  }
  return c.json({ ok: true });
});

// How many bios were suggested from the site since each member was last saved: { counts: { id: n } }.
route.get("/bio-suggestions", async (c) => {
  const rows = await getDb(c.env)
    .select({ id: bioEdits.memberId, n: count() })
    .from(bioEdits)
    .innerJoin(members, eq(members.id, bioEdits.memberId))
    .where(gt(bioEdits.createdAt, members.updatedAt))
    .groupBy(bioEdits.memberId);
  return c.json({ counts: Object.fromEntries(rows.map((r) => [r.id, r.n])) });
});

// How many looks are waiting for approval, per member: { counts: { id: n } }.
route.get("/look-suggestions", async (c) => {
  const rows = await getDb(c.env)
    .select({ id: lookEdits.memberId, n: count() })
    .from(lookEdits)
    .where(eq(lookEdits.status, "pending"))
    .groupBy(lookEdits.memberId);
  return c.json({ counts: Object.fromEntries(rows.map((r) => [r.id, r.n])) });
});

// Every look suggested for this member, newest first (the latest 200).
route.get("/:id/look-edits", async (c) => {
  const edits = await getDb(c.env)
    .select({ id: lookEdits.id, char: lookEdits.char, body: lookEdits.body, wear: lookEdits.wear, status: lookEdits.status, createdAt: lookEdits.createdAt })
    .from(lookEdits)
    .where(eq(lookEdits.memberId, c.req.param("id")))
    .orderBy(desc(lookEdits.id))
    .limit(200);
  return c.json({ edits });
});

// Puts a suggested look on the member, after checking it against their badges as they are now.
route.post("/:id/look-edits/:editId/approve", async (c) => {
  const id = c.req.param("id");
  const editId = Number(c.req.param("editId"));
  const db = getDb(c.env);
  const [[edit], [member], [badgeCount], awardRows] = await db.batch([
    db.select().from(lookEdits).where(and(eq(lookEdits.id, editId), eq(lookEdits.memberId, id))),
    db.select().from(members).where(eq(members.id, id)),
    db.select({ n: count() }).from(memberBadges).where(eq(memberBadges.memberId, id)),
    db.select({ id: memberAccessories.accessoryId }).from(memberAccessories).where(eq(memberAccessories.memberId, id)),
  ]);
  if (!edit || !member) return c.json({ error: "Suggestion not found" }, 404);
  if (edit.status !== "pending") return c.json({ error: "This one was already handled" }, 400);
  const accessories = awardRows.map((a) => a.id);
  const current = { char: member.avatarChar, body: member.avatarBody, wear: cleanWear(member.avatarWear, accessories) };
  const problem = checkLook({ role: member.role, badges: badgeCount.n, accessories, current }, edit);
  if (problem) return c.json({ error: `Can't use this one any more. ${problem}` }, 400);
  // members.updatedAt is left alone: it marks when the form was last saved, which the new-bio count relies on.
  await db.batch([
    db.update(members).set({ avatarChar: edit.char, avatarBody: edit.body, avatarWear: edit.wear }).where(eq(members.id, id)),
    db.update(lookEdits).set({ status: "approved" }).where(eq(lookEdits.id, editId)),
  ]);
  return c.json({ ok: true });
});

route.post("/:id/look-edits/:editId/discard", async (c) => {
  const [done] = await getDb(c.env)
    .update(lookEdits)
    .set({ status: "discarded" })
    .where(and(eq(lookEdits.id, Number(c.req.param("editId"))), eq(lookEdits.memberId, c.req.param("id")), eq(lookEdits.status, "pending")))
    .returning({ id: lookEdits.id });
  if (!done) return c.json({ error: "Suggestion not found" }, 404);
  return c.json({ ok: true });
});

// Clears this member's look suggestions. Their current look stays.
route.delete("/:id/look-edits", async (c) => {
  await getDb(c.env).delete(lookEdits).where(eq(lookEdits.memberId, c.req.param("id")));
  return c.json({ ok: true });
});

// Every bio suggested for this member from the site, newest first (the latest 200).
// `isNew`: sent after the member was last saved, so nobody has looked at it yet.
route.get("/:id/bio-edits", async (c) => {
  const db = getDb(c.env);
  const [member] = await db.select({ updatedAt: members.updatedAt }).from(members).where(eq(members.id, c.req.param("id")));
  if (!member) return c.json({ error: "Member not found" }, 404);
  const edits = await db
    .select({ id: bioEdits.id, bio: bioEdits.bio, createdAt: bioEdits.createdAt })
    .from(bioEdits)
    .where(eq(bioEdits.memberId, c.req.param("id")))
    .orderBy(desc(bioEdits.id))
    .limit(200);
  return c.json({ edits: edits.map((e) => ({ ...e, isNew: e.createdAt > member.updatedAt })) });
});

// Clears this member's bio history (e.g. after spam). Their current bio stays.
route.delete("/:id/bio-edits", async (c) => {
  await getDb(c.env).delete(bioEdits).where(eq(bioEdits.memberId, c.req.param("id")));
  return c.json({ ok: true });
});

route.delete("/:id", async (c) => {
  const [gone] = await getDb(c.env).delete(members).where(eq(members.id, c.req.param("id"))).returning({ id: members.id });
  if (!gone) return c.json({ error: "Member not found" }, 404);
  return c.json({ ok: true });
});

export default route;
