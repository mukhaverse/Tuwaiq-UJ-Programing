// Admin: the live board's log. Every question ever published, newest first, with all
// its answers (hidden ones too, marked). Publishing a new question keeps the old one's
// answers; only "Reset board" deletes them.
import { Hono } from "hono";
import { asc, desc, eq } from "drizzle-orm";
import { getDb, type AppEnv } from "../../db/client";
import { liveAnswers, liveSessions, members } from "../../db/schema";

const route = new Hono<AppEnv>();

route.get("/", async (c) => {
  const db = getDb(c.env);
  const [sessions, answers] = await Promise.all([
    db.select().from(liveSessions).orderBy(desc(liveSessions.id)),
    db
      .select({
        id: liveAnswers.id,
        sessionId: liveAnswers.sessionId,
        text: liveAnswers.text,
        hidden: liveAnswers.hidden,
        createdAt: liveAnswers.createdAt,
        name: members.name,
      })
      .from(liveAnswers)
      .innerJoin(members, eq(members.id, liveAnswers.memberId))
      .orderBy(asc(liveAnswers.id)),
  ]);
  const bySession = new Map<number, typeof answers>();
  for (const a of answers) bySession.set(a.sessionId, [...(bySession.get(a.sessionId) ?? []), a]);
  return c.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      question: s.question,
      createdAt: s.createdAt,
      current: s.endedAt === null,
      answers: (bySession.get(s.id) ?? []).map((a) => ({ id: a.id, name: a.name, text: a.text, hidden: a.hidden, createdAt: a.createdAt })),
    })),
  });
});

export default route;
