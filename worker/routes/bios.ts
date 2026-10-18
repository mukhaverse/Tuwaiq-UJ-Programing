// POST /api/bios/<member id>: anyone can suggest a bio from a member's profile card.
// No sign-in, so nothing goes live: the suggestion is kept in bio_edits and shows
// up in the admin panel (Members → Bio history), where an admin can use it.
// Rate limited per visitor in worker/index.ts, and capped per member and per day here,
// so a flood can't fill the database.
import { Hono } from "hono";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../db/client";
import { bioEdits, members } from "../db/schema";
import { body, plainText, slug } from "./admin/shared";

const PER_MEMBER_PER_DAY = 5;
const TOTAL_PER_DAY = 100;

const route = new Hono<AppEnv>();

route.post("/:id", body(z.object({ bio: plainText(600) })), async (c) => {
  const id = slug.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Member not found" }, 404);
  const { bio } = c.req.valid("json");
  const db = getDb(c.env);
  const [member] = await db.select({ id: members.id }).from(members).where(eq(members.id, id.data));
  if (!member) return c.json({ error: "Member not found" }, 404);

  const today = gt(bioEdits.createdAt, sql`datetime('now', '-1 day')`);
  const [[forMember], [total]] = await db.batch([
    db.select({ n: count() }).from(bioEdits).where(and(eq(bioEdits.memberId, id.data), today)),
    db.select({ n: count() }).from(bioEdits).where(today),
  ]);
  if (forMember.n >= PER_MEMBER_PER_DAY || total.n >= TOTAL_PER_DAY) {
    return c.json({ error: "We've had a lot of suggestions today. Try again tomorrow." }, 429);
  }

  await db.insert(bioEdits).values({ memberId: id.data, bio });
  return c.json({ ok: true }, 201);
});

export default route;
