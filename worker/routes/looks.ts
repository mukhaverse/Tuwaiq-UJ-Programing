// POST /api/looks/<member id>: anyone can change a member's look (shape, colour,
// accessories) from their profile, within what their badges unlock. It goes live
// straight away, and is also kept in look_edits (as approved), the log admins see
// under Members → Look suggestions.
// Rate limited per visitor in worker/index.ts, and capped per member and per day here.
import { Hono } from "hono";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../db/client";
import { lookEdits, memberAccessories, memberBadges, members } from "../db/schema";
import { checkLook, cleanWear, sameLook } from "../../src/data/looks";
import { body, slug } from "./admin/shared";

const PER_MEMBER_PER_DAY = 5;
const TOTAL_PER_DAY = 100;

const lookInput = z.object({
  char: z.string().trim().max(30),
  body: z.string().trim().max(30),
  wear: z.array(z.string().trim().max(30)).max(3).default([]),
});

const route = new Hono<AppEnv>();

route.post("/:id", body(lookInput), async (c) => {
  const id = slug.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Member not found" }, 404);
  const look = c.req.valid("json");
  const db = getDb(c.env);
  const today = gt(lookEdits.createdAt, sql`datetime('now', '-1 day')`);
  const [[member], [badgeCount], awardRows, [forMember], [total]] = await db.batch([
    db.select().from(members).where(eq(members.id, id.data)),
    db.select({ n: count() }).from(memberBadges).where(eq(memberBadges.memberId, id.data)),
    db.select({ id: memberAccessories.accessoryId }).from(memberAccessories).where(eq(memberAccessories.memberId, id.data)),
    db.select({ n: count() }).from(lookEdits).where(and(eq(lookEdits.memberId, id.data), today)),
    db.select({ n: count() }).from(lookEdits).where(today),
  ]);
  if (!member) return c.json({ error: "Member not found" }, 404);

  const accessories = awardRows.map((a) => a.id);
  const current = { char: member.avatarChar, body: member.avatarBody, wear: cleanWear(member.avatarWear, accessories) };
  if (sameLook(look, current)) return c.json({ error: "That's already their look." }, 400);
  const problem = checkLook({ role: member.role, badges: badgeCount.n, accessories, current }, look);
  if (problem) return c.json({ error: problem }, 400);
  if (forMember.n >= PER_MEMBER_PER_DAY || total.n >= TOTAL_PER_DAY) {
    return c.json({ error: "We've had a lot of suggestions today. Try again tomorrow." }, 429);
  }

  await db.batch([
    db.insert(lookEdits).values({ memberId: id.data, char: look.char, body: look.body, wear: look.wear, status: "approved" }),
    db
      .update(members)
      .set({ avatarChar: look.char, avatarBody: look.body, avatarWear: look.wear, updatedAt: sql`(datetime('now'))` })
      .where(eq(members.id, id.data)),
  ]);
  return c.json({ ok: true }, 201);
});

export default route;
