// Admin: give an awarded accessory (one beyond the starter set) to every member at
// once, or take it back from everyone. Members added later don't get it automatically.
import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { getDb, type AppEnv } from "../../db/client";
import { memberAccessories, members } from "../../db/schema";
import { ACCESSORIES } from "../../../src/data/looks";

const isExtra = (id: string) => ACCESSORIES.some((a) => a.id === id && !a.starter);

const route = new Hono<AppEnv>();

route.post("/:id/everyone", async (c) => {
  const id = c.req.param("id");
  if (!isExtra(id)) return c.json({ error: "Accessory not found" }, 404);
  await getDb(c.env).run(sql`INSERT OR IGNORE INTO member_accessories (member_id, accessory_id) SELECT id, ${id} FROM members`);
  return c.json({ ok: true });
});

// Also takes it off anyone wearing it, so it doesn't come back if it's given out again.
route.delete("/:id/everyone", async (c) => {
  const id = c.req.param("id");
  if (!isExtra(id)) return c.json({ error: "Accessory not found" }, 404);
  const db = getDb(c.env);
  await db.batch([
    db.delete(memberAccessories).where(eq(memberAccessories.accessoryId, id)),
    db
      .update(members)
      .set({ avatarWear: sql`(SELECT json_group_array(value) FROM json_each(${members.avatarWear}) WHERE value != ${id})` })
      .where(sql`EXISTS (SELECT 1 FROM json_each(${members.avatarWear}) WHERE value = ${id})`),
  ]);
  return c.json({ ok: true });
});

export default route;
