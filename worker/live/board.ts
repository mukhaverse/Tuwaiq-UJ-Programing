// The live board's data: what the board shows, read from D1, and the messages sent
// to every open board (through the LiveBoard Durable Object, see ./LiveBoard.ts).
// Only public member fields ever leave here: id, card name and their character.
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../db/client";
import { liveAnswers, liveSessions, memberAccessories, members } from "../db/schema";
import { cleanWear } from "../../src/data/looks";
import { displayName } from "../../src/data/names";

export const MAX_ANSWER = 140;
export const MAX_QUESTION = 160;
// Per member, per question.
export const MAX_ANSWERS_EACH = 3;
export const ANSWER_GAP_SECONDS = 10;
// Per question, so one session can't grow without end.
export const MAX_ANSWERS_TOTAL = 1000;

export type PublicMember = { id: string; name: string; avatar: { char: string; body: string; wear: string[] } };
export type PublicAnswer = { id: number; text: string; createdAt: string; member: PublicMember };
export type PublicSession = { id: number; question: string; open: boolean };
export type Board = { session: PublicSession | null; answers: PublicAnswer[] };

export type LiveMessage =
  | ({ type: "sync" } & Board)
  | { type: "answer:new"; sessionId: number; answer: PublicAnswer }
  | { type: "answer:hidden"; sessionId: number; id: number }
  | { type: "session:new"; session: PublicSession }
  | { type: "session:state"; session: PublicSession };

type MemberRow = { id: string; name: string; short: string | null; avatarChar: string; avatarBody: string; avatarWear: unknown };

/** Members' public faces, with worn extras they no longer have dropped (as on the main site). */
export async function publicMembers(env: Env, rows: MemberRow[]): Promise<Map<string, PublicMember>> {
  const ids = [...new Set(rows.map((r) => r.id))];
  const awarded = new Map<string, string[]>();
  if (ids.length) {
    // D1 allows 100 bound values per query.
    for (let i = 0; i < ids.length; i += 90) {
      const part = await getDb(env)
        .select()
        .from(memberAccessories)
        .where(inArray(memberAccessories.memberId, ids.slice(i, i + 90)));
      for (const a of part) awarded.set(a.memberId, [...(awarded.get(a.memberId) ?? []), a.accessoryId]);
    }
  }
  return new Map(
    rows.map((m) => [
      m.id,
      {
        id: m.id,
        name: displayName(m),
        avatar: { char: m.avatarChar, body: m.avatarBody, wear: cleanWear(m.avatarWear, awarded.get(m.id) ?? []) },
      },
    ])
  );
}

const memberColumns = {
  id: members.id,
  name: members.name,
  short: members.short,
  avatarChar: members.avatarChar,
  avatarBody: members.avatarBody,
  avatarWear: members.avatarWear,
};

/** The question on the board now, or null before the first one is published. */
export async function currentSession(env: Env) {
  const [row] = await getDb(env).select().from(liveSessions).where(isNull(liveSessions.endedAt)).orderBy(desc(liveSessions.id)).limit(1);
  return row ?? null;
}

export const publicSession = (s: { id: number; question: string; isOpen: boolean }): PublicSession => ({
  id: s.id,
  question: s.question,
  open: s.isOpen,
});

/** Everything a board needs to draw itself: the question and its visible answers, oldest first. */
export async function loadBoard(env: Env): Promise<Board> {
  const session = await currentSession(env);
  if (!session) return { session: null, answers: [] };
  const rows = await getDb(env)
    .select({ id: liveAnswers.id, text: liveAnswers.text, createdAt: liveAnswers.createdAt, member: memberColumns })
    .from(liveAnswers)
    .innerJoin(members, eq(members.id, liveAnswers.memberId))
    .where(and(eq(liveAnswers.sessionId, session.id), eq(liveAnswers.hidden, false)))
    .orderBy(asc(liveAnswers.createdAt), asc(liveAnswers.id));
  const faces = await publicMembers(
    env,
    rows.map((r) => r.member)
  );
  return {
    session: publicSession(session),
    answers: rows.map((r) => ({ id: r.id, text: r.text, createdAt: r.createdAt, member: faces.get(r.member.id)! })),
  };
}

/** Sends a message to every open board. Called after the change is saved in D1. */
export async function broadcast(env: Env, message: LiveMessage) {
  const stub = env.LIVE_BOARD.get(env.LIVE_BOARD.idFromName("board"));
  await stub.broadcast(JSON.stringify(message));
}

/** Answer text as plain words: no tags, no control or direction-flipping characters, single spaces. */
export function cleanAnswer(text: string): string {
  return (
    text
      .normalize("NFC")
      // Tags (and what's left of a broken one at the end). "a < b" stays as it is.
      .replace(/<\/?[a-z!][^>]*(>|$)/gi, "")
      // oxlint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      // Zero-width space, direction marks and overrides (emoji joiners are kept).
      .replace(/[​‎‏‪-‮⁦-⁩﻿]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}
