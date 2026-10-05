// Admin: collaborations with other tracks (often from requests) and the track's
// own projects. Triage new requests, assign members, move them through the
// statuses, or add projects directly.
// The list here includes private fields (contact, details), so it's never cached.
import { Hono } from "hono";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../../db/client";
import { members, PROJECT_STATUSES, projectMembers, projects } from "../../db/schema";
import { body, kind, optionalText, requiredText, trackExists } from "./shared";

const input = z.object({
  title: requiredText(80),
  // Set for a collaboration; null for one of the track's own projects.
  trackId: optionalText(60),
  forLabel: optionalText(60),
  kind,
  status: z.enum(PROJECT_STATUSES),
  summary: z.string().trim().max(140).default(""),
  note: z.string().trim().max(160).default(""),
  details: z.string().trim().max(3000).default(""),
  requester: optionalText(80),
  requesterTrack: optionalText(60),
  contact: optionalText(120),
  deadline: optionalText(60),
  members: z.array(z.string()).max(30).default([]),
});
type Input = z.infer<typeof input>;

const route = new Hono<AppEnv>();

route.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "private, no-store");
});

route.get("/", async (c) => {
  const db = getDb(c.env);
  const [rows, assigned] = await db.batch([
    db.select().from(projects).orderBy(desc(projects.createdAt), desc(projects.id)),
    db.select().from(projectMembers),
  ]);
  const team = new Map<number, string[]>();
  for (const a of assigned) team.set(a.projectId, [...(team.get(a.projectId) ?? []), a.memberId]);
  return c.json({ projects: rows.map((p) => ({ ...p, members: team.get(p.id) ?? [] })) });
});

// Marking a project done stamps when; reopening it clears the stamp.
const finished = (status: Input["status"], before?: { status: string; finishedAt: string | null }) => {
  if (status !== "done") return { finishedAt: null };
  if (before?.status === "done" && before.finishedAt) return {};
  return { finishedAt: sql`(datetime('now'))` };
};

route.post("/", body(input), async (c) => {
  const { members: team, ...p } = c.req.valid("json");
  if (p.trackId && !(await trackExists(c.env, p.trackId))) return c.json({ error: "That track doesn't exist anymore" }, 400);
  const db = getDb(c.env);
  const [created] = await db
    .insert(projects)
    .values({ ...p, ...finished(p.status) })
    .returning({ id: projects.id });
  await setTeam(c.env, created.id, team);
  return c.json({ ok: true, id: created.id }, 201);
});

route.put("/:id", body(input), async (c) => {
  const id = Number(c.req.param("id"));
  const { members: team, ...p } = c.req.valid("json");
  if (p.trackId && !(await trackExists(c.env, p.trackId))) return c.json({ error: "That track doesn't exist anymore" }, 400);
  const db = getDb(c.env);
  const [before] = await db.select({ status: projects.status, finishedAt: projects.finishedAt }).from(projects).where(eq(projects.id, id));
  if (!before) return c.json({ error: "Project not found" }, 404);
  const [updated] = await db
    .update(projects)
    .set({ ...p, ...finished(p.status, before), updatedAt: sql`(datetime('now'))` })
    .where(eq(projects.id, id))
    .returning({ id: projects.id });
  if (!updated) return c.json({ error: "Project not found" }, 404);
  await setTeam(c.env, id, team);
  return c.json({ ok: true });
});

route.delete("/:id", async (c) => {
  const [gone] = await getDb(c.env)
    .delete(projects)
    .where(eq(projects.id, Number(c.req.param("id"))))
    .returning({ id: projects.id });
  if (!gone) return c.json({ error: "Project not found" }, 404);
  return c.json({ ok: true });
});

/** Replaces who's assigned to a project. Ids that aren't on the roster are skipped. */
async function setTeam(env: Env, projectId: number, ids: Input["members"]) {
  const db = getDb(env);
  const known = ids.length ? await db.select({ id: members.id }).from(members).where(inArray(members.id, ids)) : [];
  await db.batch([
    db.delete(projectMembers).where(eq(projectMembers.projectId, projectId)),
    ...known.map((m) => db.insert(projectMembers).values({ projectId, memberId: m.id })),
  ]);
}

export default route;
