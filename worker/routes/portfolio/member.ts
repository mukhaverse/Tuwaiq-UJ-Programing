// A verified member's own portfolio task (requireMember: only ever their own roster id,
// taken from their login, never from the request).
//
//   GET  /api/portfolio/me             the task, every submission, the thread, deadlines
//   POST /api/portfolio/me/submit      { url, comment?, seq }  send (or resend) a portfolio
//   POST /api/portfolio/me/messages    { body }  a question or reply; never changes the status
//   POST /api/portfolio/me/read        the thread and its notifications are read
import { Hono } from "hono";
import { eq, max, sql } from "drizzle-orm";
import { z } from "zod";
import { requireMember } from "../../auth";
import { getDb, type AppEnv } from "../../db/client";
import { portfolioEvents, portfolioMessages, portfolioSubmissions, portfolioTasks } from "../../db/schema";
import {
  checkPortfolioUrl,
  deadlineKeyFor,
  dueFor,
  isLate,
  statusAfterSubmit,
  submissionKindFor,
  submissionsClosed,
  type SubmissionKind,
} from "../../../src/data/portfolio";
import { body, isDuplicate } from "../admin/shared";
import { CHANGED, getDeadlines, getTask, loadTaskDetail, markTaskRead, messageText, notify, optionalMessageText } from "./shared";

const route = new Hono<AppEnv>();
route.use("*", requireMember);

route.get("/", async (c) => {
  const db = getDb(c.env);
  const member = c.get("member");
  const [detail, deadlines] = await Promise.all([loadTaskDetail(db, member.id, c.get("user").id), getDeadlines(db)]);
  return c.json({ member: { name: member.name, memberId: member.memberId }, deadlines, ...detail });
});

const LEADER_NOTICE: Record<SubmissionKind, "submitted" | "resubmitted" | "url_updated"> = {
  initial: "submitted",
  revision: "resubmitted",
  correction: "resubmitted",
  update: "url_updated",
};

route.post(
  "/submit",
  body(z.object({ url: z.string().max(600), comment: optionalMessageText(2000), seq: z.number().int().min(0) })),
  async (c) => {
    const db = getDb(c.env);
    const member = c.get("member");
    const user = c.get("user");
    const input = c.req.valid("json");

    const checked = checkPortfolioUrl(input.url);
    if ("error" in checked) return c.json({ error: checked.error }, 400);

    const [task, deadlines] = await Promise.all([getTask(db, member.id), getDeadlines(db)]);
    // The page was showing an older state (another tab, or a leader just reviewed it).
    if (input.seq !== task.seq) return c.json({ error: CHANGED }, 409);
    const kind = submissionKindFor(task.status);
    const next = statusAfterSubmit(task.status);
    if (!kind || !next) return c.json({ error: "Your portfolio is already approved, so there's nothing left to send." }, 400);
    if (submissionsClosed(task.status, deadlines)) {
      return c.json({ error: "The leaders closed submissions after the deadline. Send them a message below." }, 403);
    }
    if (kind === "update" && checked.url === task.currentUrl) return c.json({ error: "That's already the link the leaders have." }, 400);

    const key = deadlineKeyFor(kind);
    const late = key ? isLate(new Date(), dueFor(deadlines, key)) : null;
    const [{ v }] = await db.select({ v: max(portfolioSubmissions.version) }).from(portfolioSubmissions).where(eq(portfolioSubmissions.rosterId, member.id));
    const version = (v ?? 0) + 1;
    const seq = task.seq + 1;
    const now = sql`(datetime('now'))`;

    try {
      // All or nothing. The event's unique (rosterId, seq) makes a second click, or a
      // leader's review landing at the same moment, fail here instead of applying twice.
      await db.batch([
        db.insert(portfolioEvents).values({ rosterId: member.id, seq, kind: "submitted", fromStatus: task.status, toStatus: next, actorId: user.id, actorName: member.name }),
        db
          .update(portfolioTasks)
          .set({
            status: next,
            seq,
            currentUrl: checked.url,
            ...(kind === "initial" ? { initialAt: now } : {}),
            ...(kind === "revision" || kind === "correction" ? { revisedAt: now } : {}),
            lastActivityAt: now,
            updatedAt: now,
          })
          .where(eq(portfolioTasks.rosterId, member.id)),
        db.insert(portfolioSubmissions).values({ rosterId: member.id, version, kind, url: checked.url, late, userId: user.id }),
        db.insert(portfolioMessages).values({
          rosterId: member.id,
          authorId: user.id,
          authorName: member.name,
          authorRole: "member",
          kind: "submission",
          body: input.comment ?? "",
          version,
        }),
        notify(db, "leaders", member.id, LEADER_NOTICE[kind], member.name, `submission:${member.id}:${version}`),
      ]);
    } catch (err) {
      if (isDuplicate(err)) return c.json({ error: CHANGED }, 409);
      throw err;
    }
    return c.json({ ok: true, status: next, version, late }, 201);
  }
);

route.post("/messages", body(z.object({ body: messageText(2000) })), async (c) => {
  const db = getDb(c.env);
  const member = c.get("member");
  const user = c.get("user");
  await getTask(db, member.id);
  const [msg] = await db
    .insert(portfolioMessages)
    .values({ rosterId: member.id, authorId: user.id, authorName: member.name, authorRole: "member", kind: "comment", body: c.req.valid("json").body })
    .returning({ id: portfolioMessages.id });
  // A comment never moves the task: only its last-activity time.
  await db.batch([
    db.update(portfolioTasks).set({ lastActivityAt: sql`(datetime('now'))` }).where(eq(portfolioTasks.rosterId, member.id)),
    notify(db, "leaders", member.id, "member_comment", member.name, `message:${msg.id}`),
  ]);
  return c.json({ ok: true }, 201);
});

route.post("/read", async (c) => {
  await markTaskRead(getDb(c.env), c.get("member").id, c.get("user").id, "member");
  return c.json({ ok: true });
});

export default route;
