// Admin: site-wide settings stored as JSON (see `settings` in db/schema.ts).
// Each key has its own shape below; add a key here to make it editable.
import { Hono } from "hono";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../../db/client";
import { settings } from "../../db/schema";
import { requiredText } from "./shared";

const optional = (max: number) => z.string().trim().max(max).default("");

const shapes = {
  track: z.object({
    club: requiredText(60),
    name: requiredText(60),
    short: requiredText(8),
    tagline: requiredText(80),
    semester: requiredText(30),
    intro: requiredText(400),
  }),
  announcement: z.object({
    eyebrow: optional(40),
    big: optional(3),
    title: requiredText(80),
    body: optional(300),
    ctaLabel: optional(30),
    ctaUrl: z.union([z.literal(""), z.string().trim().regex(/^(https?:\/\/|#)/, "Use a full link (https://…) or a section like #journey")]).default(""),
  }),
  // Whether visitors can send build requests (the form and its button on the site).
  requests: z.object({ open: z.boolean() }),
} as const;

type Key = keyof typeof shapes;
const isKey = (key: string): key is Key => key in shapes;

const route = new Hono<AppEnv>();

route.put("/:key", async (c) => {
  const key = c.req.param("key");
  if (!isKey(key)) return c.json({ error: "Unknown setting" }, 404);
  const parsed = shapes[key].safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json({ error: `${issue.path.join(".") || "value"}: ${issue.message}` }, 400);
  }
  await getDb(c.env)
    .insert(settings)
    .values({ key, value: parsed.data })
    .onConflictDoUpdate({ target: settings.key, set: { value: parsed.data, updatedAt: sql`(datetime('now'))` } });
  return c.json({ ok: true });
});

// Removing the announcement hides the "Up next" tile.
route.delete("/:key", async (c) => {
  const key = c.req.param("key");
  if (key !== "announcement") return c.json({ error: "This setting can't be removed" }, 400);
  await getDb(c.env).delete(settings).where(eq(settings.key, key));
  return c.json({ ok: true });
});

export default route;
