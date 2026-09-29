// Admin: the badges members can earn. (Who has earned what is set on each member.)
import { Hono } from "hono";
import { eq, max, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../../db/client";
import { badges } from "../../db/schema";
import { body, isDuplicate, optionalText, orderInput, requiredText, slug } from "./shared";

const fields = {
  name: requiredText(60),
  description: z.string().trim().max(200).default(""),
  glyph: requiredText(3),
  milestone: optionalText(80),
};
const createInput = z.object({ id: slug, ...fields });
const updateInput = z.object(fields);

type Fields = z.infer<typeof updateInput>;
const columns = ({ milestone, ...b }: Fields) => ({ ...b, milestoneId: milestone });

const route = new Hono<AppEnv>();

route.post("/", body(createInput), async (c) => {
  const { id, ...b } = c.req.valid("json");
  const db = getDb(c.env);
  const [{ last }] = await db.select({ last: max(badges.position) }).from(badges);
  try {
    await db.insert(badges).values({ id, ...columns(b), position: (last ?? -1) + 1 });
  } catch (err) {
    if (isDuplicate(err)) return c.json({ error: `The id "${id}" is already taken` }, 409);
    throw err;
  }
  return c.json({ ok: true, id }, 201);
});

route.put("/order", body(orderInput), async (c) => {
  const db = getDb(c.env);
  const [first, ...rest] = c.req.valid("json").ids.map((id, position) => db.update(badges).set({ position }).where(eq(badges.id, id)));
  await db.batch([first, ...rest]);
  return c.json({ ok: true });
});

route.put("/:id", body(updateInput), async (c) => {
  const [updated] = await getDb(c.env)
    .update(badges)
    .set({ ...columns(c.req.valid("json")), updatedAt: sql`(datetime('now'))` })
    .where(eq(badges.id, c.req.param("id")))
    .returning({ id: badges.id });
  if (!updated) return c.json({ error: "Badge not found" }, 404);
  return c.json({ ok: true });
});

route.delete("/:id", async (c) => {
  const [gone] = await getDb(c.env).delete(badges).where(eq(badges.id, c.req.param("id"))).returning({ id: badges.id });
  if (!gone) return c.json({ error: "Badge not found" }, 404);
  return c.json({ ok: true });
});

export default route;
