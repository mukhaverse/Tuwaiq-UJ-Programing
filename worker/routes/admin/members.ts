// Admin: add, edit, reorder and remove members, set which badges they've earned,
// and read the log of bios submitted from the site.
import { Hono } from "hono";
import { and, desc, eq, max, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../../db/client";
import { bioEdits, memberBadges, members } from "../../db/schema";
import { body, isDuplicate, optionalText, orderInput, requiredText, slug } from "./shared";

const fields = {
  name: requiredText(120),
  short: optionalText(60),
  role: z.enum(["leader", "co-leader", "member"]),
  major: requiredText(80),
  year: z.coerce.number().int().min(1).max(7),
  bio: optionalText(600),
  quote: optionalText(160),
  avatar: z.object({ char: requiredText(30), body: requiredText(30) }),
  badges: z.array(z.string()).default([]),
};
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
  // Badges: replace the whole set, keeping the award date of ones they already had.
  const had = await db.select().from(memberBadges).where(eq(memberBadges.memberId, id));
  const keep = new Set(m.badges);
  const hadIds = new Set(had.map((h) => h.badgeId));
  const writes = [
    ...had.filter((h) => !keep.has(h.badgeId)).map((h) => db.delete(memberBadges).where(and(eq(memberBadges.memberId, id), eq(memberBadges.badgeId, h.badgeId)))),
    ...m.badges.filter((b) => !hadIds.has(b)).map((badgeId) => db.insert(memberBadges).values({ memberId: id, badgeId })),
  ];
  if (writes.length) {
    const [first, ...rest] = writes;
    await db.batch([first, ...rest]);
  }
  return c.json({ ok: true });
});

// Every bio submitted for this member from the site, newest first.
route.get("/:id/bio-edits", async (c) => {
  const edits = await getDb(c.env)
    .select({ id: bioEdits.id, bio: bioEdits.bio, createdAt: bioEdits.createdAt })
    .from(bioEdits)
    .where(eq(bioEdits.memberId, c.req.param("id")))
    .orderBy(desc(bioEdits.id));
  return c.json({ edits });
});

route.delete("/:id", async (c) => {
  const [gone] = await getDb(c.env).delete(members).where(eq(members.id, c.req.param("id"))).returning({ id: members.id });
  if (!gone) return c.json({ error: "Member not found" }, 404);
  return c.json({ ok: true });
});

export default route;
