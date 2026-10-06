// POST /api/bios/<member id>: anyone writes a member's bio from their profile card.
// No sign-in and no review: it goes live at once, and every submission is kept in
// bio_edits so an admin can see the history and put an earlier one back.
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../db/client";
import { bioEdits, members } from "../db/schema";
import { body, requiredText } from "./admin/shared";

const route = new Hono<AppEnv>();

// Turns away form posts from other sites (and their scripts can't send JSON here either: no CORS).
route.use("*", csrf());

route.post("/:id", body(z.object({ bio: requiredText(600) })), async (c) => {
  const id = c.req.param("id");
  const { bio } = c.req.valid("json");
  const db = getDb(c.env);
  const [member] = await db.select({ id: members.id }).from(members).where(eq(members.id, id));
  if (!member) return c.json({ error: "Member not found" }, 404);
  await db.batch([
    db.insert(bioEdits).values({ memberId: id, bio }),
    db.update(members).set({ bio, updatedAt: sql`(datetime('now'))` }).where(eq(members.id, id)),
  ]);
  return c.json({ ok: true, bio }, 201);
});

export default route;
