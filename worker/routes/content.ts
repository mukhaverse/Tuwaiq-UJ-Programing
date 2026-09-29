// GET /api/content: everything the public site renders, in one request.
import { Hono } from "hono";
import { asc } from "drizzle-orm";
import { getDb, type AppEnv } from "../db/client";
import { badges, memberBadges, members, milestones, settings } from "../db/schema";

const content = new Hono<AppEnv>();

content.get("/", async (c) => {
  const db = getDb(c.env);
  // One round trip to D1 for all five queries.
  const [memberRows, awardRows, milestoneRows, badgeRows, settingRows] = await db.batch([
    db.select().from(members).orderBy(asc(members.position), asc(members.createdAt)),
    db.select().from(memberBadges).orderBy(asc(memberBadges.awardedAt)),
    db.select().from(milestones).orderBy(asc(milestones.position)),
    db.select().from(badges).orderBy(asc(badges.position)),
    db.select().from(settings),
  ]);

  const awarded = new Map<string, string[]>();
  for (const a of awardRows) {
    awarded.set(a.memberId, [...(awarded.get(a.memberId) ?? []), a.badgeId]);
  }
  const setting = Object.fromEntries(settingRows.map((s) => [s.key, s.value]));

  // Short browser cache: edits show up within seconds, repeat visits stay fast.
  c.header("Cache-Control", "public, max-age=10, stale-while-revalidate=60");
  return c.json({
    track: setting.track ?? {},
    announcement: setting.announcement ?? null,
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
  });
});

export default content;
