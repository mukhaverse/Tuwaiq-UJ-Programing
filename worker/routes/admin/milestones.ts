// Admin: the semester journey. Add, edit, tick off, reorder and remove milestones.
import { Hono } from "hono";
import { eq, max, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../../db/client";
import { milestones } from "../../db/schema";
import { body, isDuplicate, orderInput, requiredText, slug } from "./shared";

const fields = {
  title: requiredText(80),
  when: requiredText(40),
  note: z.string().trim().max(200).default(""),
  done: z.boolean().default(false),
  photos: z
    .array(
      z.object({
        url: z.string().trim().regex(/^\/api\/media\/\S+$/, "Upload the photo first").max(300),
        caption: z.string().trim().max(120).default(""),
        w: z.number().int().positive().max(50000).optional(),
        h: z.number().int().positive().max(50000).optional(),
      })
    )
    .max(40)
    .default([]),
};
const createInput = z.object({ id: slug, ...fields });
const updateInput = z.object(fields);

const route = new Hono<AppEnv>();

route.post("/", body(createInput), async (c) => {
  const m = c.req.valid("json");
  const db = getDb(c.env);
  const [{ last }] = await db.select({ last: max(milestones.position) }).from(milestones);
  try {
    await db.insert(milestones).values({ ...m, position: (last ?? -1) + 1 });
  } catch (err) {
    if (isDuplicate(err)) return c.json({ error: `The id "${m.id}" is already taken` }, 409);
    throw err;
  }
  return c.json({ ok: true, id: m.id }, 201);
});

route.put("/order", body(orderInput), async (c) => {
  const db = getDb(c.env);
  const [first, ...rest] = c.req.valid("json").ids.map((id, position) => db.update(milestones).set({ position }).where(eq(milestones.id, id)));
  await db.batch([first, ...rest]);
  return c.json({ ok: true });
});

route.put("/:id", body(updateInput), async (c) => {
  const [updated] = await getDb(c.env)
    .update(milestones)
    .set({ ...c.req.valid("json"), updatedAt: sql`(datetime('now'))` })
    .where(eq(milestones.id, c.req.param("id")))
    .returning({ id: milestones.id });
  if (!updated) return c.json({ error: "Milestone not found" }, 404);
  return c.json({ ok: true });
});

route.delete("/:id", async (c) => {
  const [gone] = await getDb(c.env).delete(milestones).where(eq(milestones.id, c.req.param("id"))).returning({ id: milestones.id });
  if (!gone) return c.json({ error: "Milestone not found" }, 404);
  return c.json({ ok: true });
});

export default route;
