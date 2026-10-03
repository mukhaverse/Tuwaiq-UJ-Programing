// Admin: the club's other tracks and their theme colours. Add, edit, reorder and
// remove them. Removing one turns its collaborations into plain projects.
import { Hono } from "hono";
import { eq, max, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../../db/client";
import { tracks } from "../../db/schema";
import { body, isDuplicate, orderInput, requiredText, slug } from "./shared";

const fields = {
  name: requiredText(40),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #ff8800")
    .transform((v) => v.toLowerCase()),
};
const createInput = z.object({ id: slug, ...fields });
const updateInput = z.object(fields);

const route = new Hono<AppEnv>();

route.post("/", body(createInput), async (c) => {
  const t = c.req.valid("json");
  const db = getDb(c.env);
  const [{ last }] = await db.select({ last: max(tracks.position) }).from(tracks);
  try {
    await db.insert(tracks).values({ ...t, position: (last ?? -1) + 1 });
  } catch (err) {
    if (isDuplicate(err)) return c.json({ error: `The id "${t.id}" is already taken` }, 409);
    throw err;
  }
  return c.json({ ok: true, id: t.id }, 201);
});

route.put("/order", body(orderInput), async (c) => {
  const db = getDb(c.env);
  const [first, ...rest] = c.req.valid("json").ids.map((id, position) => db.update(tracks).set({ position }).where(eq(tracks.id, id)));
  await db.batch([first, ...rest]);
  return c.json({ ok: true });
});

route.put("/:id", body(updateInput), async (c) => {
  const [updated] = await getDb(c.env)
    .update(tracks)
    .set({ ...c.req.valid("json"), updatedAt: sql`(datetime('now'))` })
    .where(eq(tracks.id, c.req.param("id")))
    .returning({ id: tracks.id });
  if (!updated) return c.json({ error: "Track not found" }, 404);
  return c.json({ ok: true });
});

route.delete("/:id", async (c) => {
  const [gone] = await getDb(c.env).delete(tracks).where(eq(tracks.id, c.req.param("id"))).returning({ id: tracks.id });
  if (!gone) return c.json({ error: "Track not found" }, 404);
  return c.json({ ok: true });
});

export default route;
