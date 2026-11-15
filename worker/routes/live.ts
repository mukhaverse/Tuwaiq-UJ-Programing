// /api/live: the live board (/live/). Members don't sign in: they type their name,
// which has to match the roster, and answer the question on the projector.
// Leaders (admins) publish questions, open and close answers, reset and hide.
// Every change is saved in D1 first, then sent to the open boards (see worker/live/).
import { Hono } from "hono";
import { eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../auth";
import { getDb, type AppEnv } from "../db/client";
import { liveAnswers, liveSessions, members } from "../db/schema";
import { rateLimit } from "../lib/guard";
import {
  ANSWER_GAP_SECONDS,
  MAX_ANSWER,
  MAX_ANSWERS_EACH,
  MAX_ANSWERS_TOTAL,
  MAX_QUESTION,
  broadcast,
  cleanAnswer,
  currentSession,
  loadBoard,
  publicMembers,
  publicSession,
} from "../live/board";
import { findMember } from "../../src/data/names";
import { body } from "./admin/shared";

const live = new Hono<AppEnv>();

live.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

const NOT_FOUND = "Name not found in club members";

/** The member a typed name belongs to (public columns only), or null. */
async function memberByName(env: Env, typed: string) {
  const roster = await getDb(env)
    .select({
      id: members.id,
      name: members.name,
      short: members.short,
      avatarChar: members.avatarChar,
      avatarBody: members.avatarBody,
      avatarWear: members.avatarWear,
    })
    .from(members)
    .orderBy(members.position, members.createdAt);
  const found = findMember(typed, roster);
  return found ? (await publicMembers(env, [found])).get(found.id)! : null;
}

// What's on the board now. Also what pages poll when WebSockets don't get through.
live.get("/state", async (c) => c.json(await loadBoard(c.env)));

const nameInput = z.object({ name: z.string().max(100) });

// Is this a club member? Only their card name and character come back; no near
// matches, nothing else about anyone.
live.post("/name", rateLimit("RL_LIVE", "live-name"), body(nameInput), async (c) => {
  const member = await memberByName(c.env, c.req.valid("json").name);
  if (!member) return c.json({ error: NOT_FOUND }, 404);
  return c.json({ member });
});

const answerInput = z.object({
  sessionId: z.number().int().positive(),
  name: z.string().max(100),
  text: z.string().max(1000),
});

live.post("/answers", rateLimit("RL_LIVE", "live-answer"), body(answerInput), async (c) => {
  const input = c.req.valid("json");
  // The name is checked again here: the page's memory of it isn't trusted.
  const member = await memberByName(c.env, input.name);
  if (!member) return c.json({ error: NOT_FOUND }, 404);
  const text = cleanAnswer(input.text);
  if (!text) return c.json({ error: "Write an answer first" }, 400);
  if ([...text].length > MAX_ANSWER) return c.json({ error: `${MAX_ANSWER} characters at most` }, 400);

  // One statement, so two answers sent at once can't both slip past the limits.
  const row = await c.env.DB.prepare(
    `INSERT INTO live_answers (session_id, member_id, text)
     SELECT ?1, ?2, ?3
     WHERE EXISTS (SELECT 1 FROM live_sessions WHERE id = ?1 AND is_open = 1 AND ended_at IS NULL)
       AND (SELECT count(*) FROM live_answers WHERE session_id = ?1 AND member_id = ?2) < ?4
       AND NOT EXISTS (SELECT 1 FROM live_answers WHERE session_id = ?1 AND member_id = ?2
                       AND created_at > datetime('now', ?5))
       AND (SELECT count(*) FROM live_answers WHERE session_id = ?1) < ?6
     RETURNING id, created_at AS createdAt`
  )
    .bind(input.sessionId, member.id, text, MAX_ANSWERS_EACH, `-${ANSWER_GAP_SECONDS} seconds`, MAX_ANSWERS_TOTAL)
    .first<{ id: number; createdAt: string }>();

  if (!row) {
    // Say which rule it was.
    const session = await currentSession(c.env);
    if (!session || session.id !== input.sessionId) return c.json({ error: "The question changed. Read the new one and try again." }, 409);
    if (!session.isOpen) return c.json({ error: "Answers closed" }, 409);
    const mine = await c.env.DB.prepare(
      `SELECT count(*) AS n, max(created_at > datetime('now', ?3)) AS recent FROM live_answers WHERE session_id = ?1 AND member_id = ?2`
    )
      .bind(session.id, member.id, `-${ANSWER_GAP_SECONDS} seconds`)
      .first<{ n: number; recent: number | null }>();
    if ((mine?.n ?? 0) >= MAX_ANSWERS_EACH) return c.json({ error: `That's ${MAX_ANSWERS_EACH} answers from you for this question` }, 429);
    if (mine?.recent) return c.json({ error: `Wait ${ANSWER_GAP_SECONDS} seconds between answers` }, 429);
    return c.json({ error: "The board is full for this question" }, 409);
  }

  const answer = { id: row.id, text, createdAt: row.createdAt, member };
  await broadcast(c.env, { type: "answer:new", sessionId: input.sessionId, answer });
  return c.json({ answer }, 201);
});

// ---------- Leaders ----------
// Checked on the server for every request (requireAdmin), whatever the page shows.
live.use("/leader/*", requireAdmin);

const questionInput = z.object({ question: z.string().trim().min(1, "Write a question").max(MAX_QUESTION) });

// A new question: ends the current one, and every board clears and shows it.
live.post("/leader/publish", body(questionInput), async (c) => {
  const question = cleanAnswer(c.req.valid("json").question);
  if (!question) return c.json({ error: "Write a question" }, 400);
  const db = getDb(c.env);
  const [, [session]] = await db.batch([
    db.update(liveSessions).set({ endedAt: new Date().toISOString() }).where(isNull(liveSessions.endedAt)),
    db.insert(liveSessions).values({ question, createdBy: c.get("user").id }).returning(),
  ]);
  const pub = publicSession(session);
  await broadcast(c.env, { type: "session:new", session: pub });
  return c.json({ session: pub }, 201);
});

const stateInput = z.object({ open: z.boolean() });

// Open or close answers to the current question.
live.post("/leader/state", body(stateInput), async (c) => {
  const session = await currentSession(c.env);
  if (!session) return c.json({ error: "Publish a question first" }, 409);
  const [row] = await getDb(c.env)
    .update(liveSessions)
    .set({ isOpen: c.req.valid("json").open })
    .where(eq(liveSessions.id, session.id))
    .returning();
  const pub = publicSession(row);
  await broadcast(c.env, { type: "session:state", session: pub });
  return c.json({ session: pub });
});

// Clear the current question's answers (the question stays).
live.post("/leader/reset", async (c) => {
  const session = await currentSession(c.env);
  if (!session) return c.json({ error: "Publish a question first" }, 409);
  await getDb(c.env).delete(liveAnswers).where(eq(liveAnswers.sessionId, session.id));
  await broadcast(c.env, { type: "sync", ...(await loadBoard(c.env)) });
  return c.json({ ok: true });
});

const idParam = z.object({ id: z.coerce.number().int().positive() });

// Take one answer off the board (it's kept in D1, marked hidden).
live.post("/leader/answers/:id/hide", body(idParam, "param"), async (c) => {
  const [row] = await getDb(c.env)
    .update(liveAnswers)
    .set({ hidden: true })
    .where(eq(liveAnswers.id, c.req.valid("param").id))
    .returning({ id: liveAnswers.id, sessionId: liveAnswers.sessionId });
  if (!row) return c.json({ error: "Answer not found" }, 404);
  await broadcast(c.env, { type: "answer:hidden", sessionId: row.sessionId, id: row.id });
  return c.json({ ok: true });
});

export default live;
