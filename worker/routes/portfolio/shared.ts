// Pieces shared by the portfolio routes: deadlines, loading a member's task, and
// writing notifications.
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../db/client";
import { notificationReads, notifications, portfolioEvents, portfolioMessages, portfolioReads, portfolioSubmissions, portfolioTasks, settings } from "../../db/schema";
import { readDeadlines, type Deadlines } from "../../../src/data/portfolio";

type Db = ReturnType<typeof getDb>;

// Control characters and direction-flipping characters. Messages are shown as plain
// text (React escapes them), so code snippets and symbols are fine.
// oxlint-disable-next-line no-control-regex
const BAD_CHARS = /[\u0000-\u0009\u000B-\u001F\u007F‪-‮⁦-⁩]/;

/** A message in the thread: trimmed, 1–max characters, no control characters. */
export const messageText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Write a message first")
    .max(max, `Keep it under ${max} characters`)
    .refine((s) => !BAD_CHARS.test(s), "Remove the special characters");

/** Same, but may be left empty (null). */
export const optionalMessageText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .refine((s) => !BAD_CHARS.test(s), "Remove the special characters")
    .nullish()
    .transform((v) => v || null);

export const DEADLINES_KEY = "portfolio_deadlines";

/** The task's deadlines as the leaders set them, earliest first (none until then).
 *  Settings saved in the first, two-deadline format are read too (see readDeadlines). */
export async function getDeadlines(db: Db): Promise<Deadlines> {
  const [row] = await db.select().from(settings).where(eq(settings.key, DEADLINES_KEY));
  return readDeadlines(row?.value);
}

/** A member's task row, made on first use (every roster member starts "not started"). */
export async function getTask(db: Db, rosterId: number) {
  await db.insert(portfolioTasks).values({ rosterId }).onConflictDoNothing();
  const [task] = await db.select().from(portfolioTasks).where(eq(portfolioTasks.rosterId, rosterId));
  return task;
}

/** Everything in one member's task: submissions, the conversation and the review history. */
export async function loadTaskDetail(db: Db, rosterId: number, viewerId: string) {
  const task = await getTask(db, rosterId);
  const [submissions, messages, events, reads] = await db.batch([
    db.select().from(portfolioSubmissions).where(eq(portfolioSubmissions.rosterId, rosterId)).orderBy(asc(portfolioSubmissions.version)),
    db
      .select({
        id: portfolioMessages.id,
        authorName: portfolioMessages.authorName,
        authorRole: portfolioMessages.authorRole,
        kind: portfolioMessages.kind,
        body: portfolioMessages.body,
        version: portfolioMessages.version,
        createdAt: portfolioMessages.createdAt,
        mine: sql<number>`${portfolioMessages.authorId} = ${viewerId}`,
      })
      .from(portfolioMessages)
      .where(eq(portfolioMessages.rosterId, rosterId))
      .orderBy(asc(portfolioMessages.createdAt), asc(portfolioMessages.id)),
    db
      .select({
        seq: portfolioEvents.seq,
        kind: portfolioEvents.kind,
        fromStatus: portfolioEvents.fromStatus,
        toStatus: portfolioEvents.toStatus,
        actorName: portfolioEvents.actorName,
        createdAt: portfolioEvents.createdAt,
      })
      .from(portfolioEvents)
      .where(eq(portfolioEvents.rosterId, rosterId))
      .orderBy(asc(portfolioEvents.seq)),
    db
      .select({ readAt: portfolioReads.readAt })
      .from(portfolioReads)
      .where(and(eq(portfolioReads.rosterId, rosterId), eq(portfolioReads.userId, viewerId))),
  ]);
  return {
    task: {
      status: task.status,
      seq: task.seq,
      corrections: task.corrections,
      currentUrl: task.currentUrl,
      initialAt: task.initialAt,
      revisedAt: task.revisedAt,
      completedAt: task.completedAt,
      completedBy: task.completedBy,
      lastActivityAt: task.lastActivityAt,
    },
    submissions: submissions.map(({ id, version, kind, url, late, createdAt }) => ({ id, version, kind, url, late, createdAt })),
    messages: messages.map((m) => ({ ...m, mine: Boolean(m.mine) })),
    events,
    // Messages after this are "new" for the person looking.
    lastReadAt: reads[0]?.readAt ?? null,
  };
}

/** Marks a member's thread, and that task's notifications, as read for this person. */
export async function markTaskRead(db: Db, rosterId: number, userId: string, audience: "leaders" | "member") {
  await db
    .insert(portfolioReads)
    .values({ rosterId, userId })
    .onConflictDoUpdate({ target: [portfolioReads.rosterId, portfolioReads.userId], set: { readAt: sql`(datetime('now'))` } });
  const unread = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.audience, audience),
        eq(notifications.rosterId, rosterId),
        sql`NOT EXISTS (SELECT 1 FROM ${notificationReads} r WHERE r.notification_id = ${notifications.id} AND r.user_id = ${userId})`
      )
    );
  // In chunks: D1 takes at most 100 bound values per query (2 per row here).
  for (let i = 0; i < unread.length; i += 45) {
    await db
      .insert(notificationReads)
      .values(unread.slice(i, i + 45).map((n) => ({ notificationId: n.id, userId })))
      .onConflictDoNothing();
  }
}

type NotificationKind = (typeof notifications.$inferInsert)["kind"];

/** A notification insert, ignored if the same event already notified (dedupeKey). */
export const notify = (db: Db, audience: "leaders" | "member", rosterId: number, kind: NotificationKind, actorName: string, dedupeKey: string) =>
  db.insert(notifications).values({ audience, rosterId, kind, actorName, dedupeKey }).onConflictDoNothing();

/** Turns the batch's "UNIQUE constraint failed" (a double click, or two leaders at once) into a clear answer. */
export const CHANGED = "This task just changed (maybe in another tab, or by the other leader). Reload and try again.";
