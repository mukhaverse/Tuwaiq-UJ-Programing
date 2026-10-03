// GET /api/content: everything the public site renders, in one request.
import { Hono } from "hono";
import { asc, desc, inArray } from "drizzle-orm";
import { getDb, type AppEnv } from "../db/client";
import { badges, memberBadges, members, milestones, projectMembers, projects, PUBLIC_PROJECT_STATUSES, settings, tracks } from "../db/schema";

const content = new Hono<AppEnv>();

content.get("/", async (c) => {
  const db = getDb(c.env);
  // One round trip to D1 for every query.
  const [memberRows, awardRows, milestoneRows, badgeRows, settingRows, trackRows, projectRows, teamRows] = await db.batch([
    db.select().from(members).orderBy(asc(members.position), asc(members.createdAt)),
    db.select().from(memberBadges).orderBy(asc(memberBadges.awardedAt)),
    db.select().from(milestones).orderBy(asc(milestones.position)),
    db.select().from(badges).orderBy(asc(badges.position)),
    db.select().from(settings),
    db.select({ id: tracks.id, name: tracks.name, color: tracks.color }).from(tracks).orderBy(asc(tracks.position)),
    // Only the public columns: a request's contact and details never leave the admin API.
    db
      .select({
        id: projects.id,
        title: projects.title,
        trackId: projects.trackId,
        forLabel: projects.forLabel,
        kind: projects.kind,
        status: projects.status,
        note: projects.note,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(inArray(projects.status, [...PUBLIC_PROJECT_STATUSES]))
      .orderBy(desc(projects.updatedAt)),
    db.select().from(projectMembers),
  ]);

  const awarded = new Map<string, string[]>();
  for (const a of awardRows) {
    awarded.set(a.memberId, [...(awarded.get(a.memberId) ?? []), a.badgeId]);
  }
  const team = new Map<number, string[]>();
  for (const t of teamRows) team.set(t.projectId, [...(team.get(t.projectId) ?? []), t.memberId]);
  const setting = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));

  // Short browser cache: edits show up within seconds, repeat visits stay fast.
  c.header("Cache-Control", "public, max-age=10, stale-while-revalidate=60");
  return c.json({
    track: setting.track ?? {},
    announcement: setting.announcement ?? null,
    requests: setting.requests ?? { open: false },
    members: memberRows.map((m) => ({
      id: m.id,
      name: m.name,
      short: m.short ?? undefined,
      role: m.role,
      major: m.major,
      year: m.year,
      bio: m.bio ?? undefined,
      quote: m.quote ?? undefined,
      avatar: { char: m.avatarChar, body: m.avatarBody },
      badges: awarded.get(m.id) ?? [],
    })),
    milestones: milestoneRows.map((m) => ({
      id: m.id,
      title: m.title,
      when: m.when,
      note: m.note,
      done: m.done,
    })),
    badges: badgeRows.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      glyph: b.glyph,
      milestone: b.milestoneId ?? undefined,
    })),
    tracks: trackRows,
    projects: projectRows.map((p) => ({
      ...p,
      trackId: p.trackId ?? undefined,
      forLabel: p.forLabel ?? undefined,
      members: team.get(p.id) ?? [],
    })),
  });
});

export default content;
