// POST /api/requests: another track asks the Programming Track to build something.
// Anyone can submit, no sign-in. It lands in the admin panel as "new" and stays
// off the public site until an admin accepts it.
import { Hono } from "hono";
import { csrf } from "hono/csrf";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../db/client";
import { projects } from "../db/schema";
import { body, kind, optionalText, requiredText } from "./admin/shared";

const requestInput = z.object({
  name: requiredText(80),
  track: requiredText(60),
  contact: requiredText(120),
  kind,
  title: requiredText(80),
  details: requiredText(3000),
  deadline: optionalText(60),
  // Honeypot: the form hides this field, so only bots fill it in.
  website: z.string().max(200).optional(),
});

// How many untouched requests the inbox holds before it stops taking more,
// so a flood of junk can't fill the database.
const INBOX_LIMIT = 100;

const route = new Hono<AppEnv>();

// Only the site's own form can post here.
route.use("*", csrf());

route.post("/", body(requestInput), async (c) => {
  const r = c.req.valid("json");
  // Bots get a cheerful "done" and nothing is saved.
  if (r.website) return c.json({ ok: true, id: 0 }, 201);

  const db = getDb(c.env);
  const [{ waiting }] = await db.select({ waiting: count() }).from(projects).where(eq(projects.status, "new"));
  if (waiting >= INBOX_LIMIT) {
    return c.json({ error: "Our inbox is full right now. Please reach out to the track directly." }, 503);
  }

  const [created] = await db
    .insert(projects)
    .values({
      title: r.title,
      track: r.track,
      kind: r.kind,
      details: r.details,
      requester: r.name,
      contact: r.contact,
      deadline: r.deadline,
    })
    .returning({ id: projects.id });
  return c.json({ ok: true, id: created.id }, 201);
});

export default route;
