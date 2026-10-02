// Admin: the members survey. Responses are imported from the survey's spreadsheet
// (parsed in the admin panel), linked to roster members, and analysed in the panel.
// Nothing here is public: like every /api/admin route it needs the admin role.
import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../../db/client";
import { members, surveyResponses } from "../../db/schema";
import { body, requiredText } from "./shared";

const row = z.object({
  respondent: requiredText(200),
  name: requiredText(200),
  memberId: z.string().nullish().transform((v) => v || null),
  submittedAt: requiredText(40),
  answers: z.record(z.string().max(200), z.string().max(5000)).refine((a) => Object.keys(a).length <= 120, "Too many columns"),
});
const importInput = z.object({ rows: z.array(row).min(1).max(2000) });
const linkInput = z.object({ respondent: requiredText(200), memberId: z.string().nullable() });

const route = new Hono<AppEnv>();

// Survey answers are personal: never let a browser or proxy keep a copy.
route.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "private, no-store");
});

route.get("/", async (c) => {
  const rows = await getDb(c.env).select().from(surveyResponses).orderBy(asc(surveyResponses.submittedAt));
  return c.json({
    responses: rows.map((r) => ({
      id: r.id,
      respondent: r.respondent,
      name: r.name,
      memberId: r.memberId,
      submittedAt: r.submittedAt,
      answers: r.answers,
    })),
  });
});

// Adds rows that aren't stored yet; rows already imported (same person, same
// submission time) are skipped, so their links stay as they are.
route.post("/import", body(importInput), async (c) => {
  const { rows } = c.req.valid("json");
  const db = getDb(c.env);
  const known = new Set((await db.select({ id: members.id }).from(members)).map((m) => m.id));
  let added = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const writes = rows.slice(i, i + 50).map((r) =>
      db
        .insert(surveyResponses)
        .values({ ...r, memberId: r.memberId && known.has(r.memberId) ? r.memberId : null })
        .onConflictDoNothing()
        .returning({ id: surveyResponses.id })
    );
    const [first, ...rest] = writes;
    const results = await db.batch([first, ...rest]);
    added += results.reduce((n, inserted) => n + inserted.length, 0);
  }
  return c.json({ ok: true, added, skipped: rows.length - added });
});

// Links every submission from one person to a roster member (or unlinks them).
route.put("/link", body(linkInput), async (c) => {
  const { respondent, memberId } = c.req.valid("json");
  const db = getDb(c.env);
  if (memberId) {
    const [member] = await db.select({ id: members.id }).from(members).where(eq(members.id, memberId));
    if (!member) return c.json({ error: "Member not found" }, 404);
  }
  const updated = await db
    .update(surveyResponses)
    .set({ memberId })
    .where(eq(surveyResponses.respondent, respondent))
    .returning({ id: surveyResponses.id });
  if (!updated.length) return c.json({ error: "Response not found" }, 404);
  return c.json({ ok: true });
});

// Removes everything one person submitted (e.g. a test entry).
route.delete("/respondent", body(z.object({ respondent: requiredText(200) })), async (c) => {
  const { respondent } = c.req.valid("json");
  await getDb(c.env).delete(surveyResponses).where(eq(surveyResponses.respondent, respondent));
  return c.json({ ok: true });
});

// Removes every response (to start over with a fresh export).
route.delete("/", async (c) => {
  await getDb(c.env).delete(surveyResponses);
  return c.json({ ok: true });
});

export default route;
