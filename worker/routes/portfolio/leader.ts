// The portfolio task's leader side (requireLeader: LEADER_GITHUB_IDS only).
//
//   GET  /overview                    every roster member's task, for the dashboard
//   GET  /tasks/:id                   one member: info, task, submissions, thread, history
//   POST /tasks/:id/read              that thread and its notifications are read (for this leader only)
//   POST /tasks/:id/messages          { body, kind: comment | feedback }
//   POST /tasks/:id/review            { action: request_revisions | approve, feedback?, seq }
//   GET  /deadlines, PUT /deadlines   { items: [{ id, due, title, note, counts }], closeAfterDeadline }
//   GET  /access                      the roster, who's linked, and sign-up problems
//   POST /roster/import               { rows: [{ name, email }], deactivateMissing }
//   POST /roster                      { name, email }  add one member
//   PATCH /roster/:id                 { name?, email? } (email only while unlinked)
//   POST /roster/:id/unlink           sign their login out and unlink it (a new one is made next sign-in)
//   POST /roster/:id/active           { active }  pause or restore their access
//   GET  /signins                     the latest member sign-ins by email (and misses)
//
// Each roster entry is matched to its public member card (for showing the character)
// automatically, by exact name ignoring case and extra spaces: see matchCharacters().
import { Hono } from "hono";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireLeader } from "../../auth";
import { getDb, type AppEnv } from "../../db/client";
import {
  accessEvents,
  memberSignins,
  members as publicMembers,
  notificationReads,
  notifications,
  portfolioEvents,
  portfolioMessages,
  portfolioReads,
  portfolioSubmissions,
  portfolioTasks,
  roster,
  rosterLinks,
  session,
  settings,
  user as users,
} from "../../db/schema";
import { DEADLINE_COUNTS, MAX_DEADLINES, checkDeadlines, normalizeEmail, normalizeName, sortDeadlines, statusAfterReview } from "../../../src/data/portfolio";
import { body, isDuplicate, requiredText } from "../admin/shared";
import { CHANGED, DEADLINES_KEY, getDeadlines, getTask, loadTaskDetail, markTaskRead, messageText, notify, optionalMessageText } from "./shared";

const route = new Hono<AppEnv>();
route.use("*", requireLeader);

const rosterId = (c: { req: { param: (k: string) => string } }) => {
  const n = Number(c.req.param("id"));
  return Number.isInteger(n) && n > 0 ? n : null;
};

/**
 * Links roster entries to their public member cards by exact name (ignoring case and extra
 * spaces), so the portfolio pages can show each member's character. Only fills entries
 * that have no card yet, and only when exactly one unused card has that name. Read-only
 * towards the cards: nothing about a character changes.
 */
async function matchCharacters(db: ReturnType<typeof getDb>) {
  const [rows, cards] = await Promise.all([
    db.select({ id: roster.id, name: roster.name, memberId: roster.memberId }).from(roster),
    db.select({ id: publicMembers.id, name: publicMembers.name }).from(publicMembers),
  ]);
  const used = new Set(rows.map((r) => r.memberId).filter(Boolean));
  const byName = new Map<string, string[]>();
  for (const c of cards) byName.set(normalizeName(c.name), [...(byName.get(normalizeName(c.name)) ?? []), c.id]);
  const updates = [];
  for (const r of rows) {
    if (r.memberId) continue;
    const free = (byName.get(normalizeName(r.name)) ?? []).filter((id) => !used.has(id));
    if (free.length !== 1) continue;
    used.add(free[0]);
    updates.push(db.update(roster).set({ memberId: free[0] }).where(eq(roster.id, r.id)));
  }
  if (updates.length) await db.batch(updates as [(typeof updates)[number], ...typeof updates]);
}

/* ---------- Dashboard ---------- */

route.get("/overview", async (c) => {
  const db = getDb(c.env);
  await matchCharacters(db);
  const me = c.get("user").id;
  const [members, lateRows, lastMemberMsg, lastAny, myReads, myUnread, deadlines] = await Promise.all([
    db
      .select({
        id: roster.id,
        name: roster.name,
        active: roster.active,
        // Public card slug, for drawing their character.
        memberId: roster.memberId,
        linked: sql<number>`${rosterLinks.userId} IS NOT NULL`,
        status: portfolioTasks.status,
        currentUrl: portfolioTasks.currentUrl,
        initialAt: portfolioTasks.initialAt,
        revisedAt: portfolioTasks.revisedAt,
        completedAt: portfolioTasks.completedAt,
      })
      .from(roster)
      .leftJoin(rosterLinks, eq(rosterLinks.rosterId, roster.id))
      .leftJoin(portfolioTasks, eq(portfolioTasks.rosterId, roster.id))
      .orderBy(asc(roster.name)),
    db
      .select({ rosterId: portfolioSubmissions.rosterId, kind: portfolioSubmissions.kind, late: portfolioSubmissions.late })
      .from(portfolioSubmissions)
      .where(inArray(portfolioSubmissions.kind, ["initial", "revision"])),
    // The member's latest question or submission note, for "new comments".
    db
      .select({ rosterId: portfolioMessages.rosterId, at: sql<string>`max(${portfolioMessages.createdAt})` })
      .from(portfolioMessages)
      .where(and(eq(portfolioMessages.authorRole, "member"), sql`${portfolioMessages.body} <> ''`))
      .groupBy(portfolioMessages.rosterId),
    // Last activity: the newest entry in each thread. Submissions, questions, replies and
    // reviews all leave one; just opening someone's page doesn't.
    db
      .select({ rosterId: portfolioMessages.rosterId, at: sql<string>`max(${portfolioMessages.createdAt})` })
      .from(portfolioMessages)
      .groupBy(portfolioMessages.rosterId),
    db.select({ rosterId: portfolioReads.rosterId, readAt: portfolioReads.readAt }).from(portfolioReads).where(eq(portfolioReads.userId, me)),
    db
      .select({ rosterId: notifications.rosterId, n: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.audience, "leaders"),
          sql`NOT EXISTS (SELECT 1 FROM ${notificationReads} r WHERE r.notification_id = ${notifications.id} AND r.user_id = ${me})`
        )
      )
      .groupBy(notifications.rosterId),
    getDeadlines(db),
  ]);

  const lateOf = new Map<number, { initial?: boolean | null; revision?: boolean | null }>();
  for (const r of lateRows) lateOf.set(r.rosterId, { ...lateOf.get(r.rosterId), [r.kind]: r.late });
  const msgAt = new Map(lastMemberMsg.map((r) => [r.rosterId, r.at]));
  const activityAt = new Map(lastAny.map((r) => [r.rosterId, r.at]));
  const readAt = new Map(myReads.map((r) => [r.rosterId, r.readAt]));
  const unreadOf = new Map(myUnread.map((r) => [r.rosterId, Number(r.n)]));

  const rows = members.map((m) => {
    const last = msgAt.get(m.id);
    const read = readAt.get(m.id);
    return {
      ...m,
      linked: Boolean(m.linked),
      status: m.status ?? "not_started",
      lastActivityAt: activityAt.get(m.id) ?? null,
      initialLate: lateOf.get(m.id)?.initial ?? null,
      revisedLate: lateOf.get(m.id)?.revision ?? null,
      newComment: Boolean(last && (!read || last > read)),
      unread: unreadOf.get(m.id) ?? 0,
    };
  });
  return c.json({ deadlines, rows, unread: [...unreadOf.values()].reduce((a, b) => a + b, 0) });
});

/* ---------- One member ---------- */

route.get("/tasks/:id", async (c) => {
  const id = rosterId(c);
  if (!id) return c.json({ error: "Member not found" }, 404);
  const db = getDb(c.env);
  const [member] = await db
    .select({
      id: roster.id,
      name: roster.name,
      active: roster.active,
      memberId: roster.memberId,
      linkedAt: rosterLinks.linkedAt,
      accountName: users.name,
      accountImage: users.image,
    })
    .from(roster)
    .leftJoin(rosterLinks, eq(rosterLinks.rosterId, roster.id))
    .leftJoin(users, eq(users.id, rosterLinks.userId))
    .where(eq(roster.id, id));
  if (!member) return c.json({ error: "Member not found" }, 404);
  const [detail, deadlines] = await Promise.all([loadTaskDetail(db, id, c.get("user").id), getDeadlines(db)]);
  return c.json({ member, deadlines, ...detail });
});

route.post("/tasks/:id/read", async (c) => {
  const id = rosterId(c);
  if (!id) return c.json({ error: "Member not found" }, 404);
  await markTaskRead(getDb(c.env), id, c.get("user").id, "leaders");
  return c.json({ ok: true });
});

async function rosterExists(db: ReturnType<typeof getDb>, id: number) {
  const [row] = await db.select({ id: roster.id }).from(roster).where(eq(roster.id, id));
  return Boolean(row);
}

route.post("/tasks/:id/messages", body(z.object({ body: messageText(4000), kind: z.enum(["comment", "feedback"]) })), async (c) => {
  const id = rosterId(c);
  const db = getDb(c.env);
  if (!id || !(await rosterExists(db, id))) return c.json({ error: "Member not found" }, 404);
  const me = c.get("user");
  const input = c.req.valid("json");
  await getTask(db, id);
  const [msg] = await db
    .insert(portfolioMessages)
    .values({ rosterId: id, authorId: me.id, authorName: me.name, authorRole: "leader", kind: input.kind, body: input.body })
    .returning({ id: portfolioMessages.id });
  await db.batch([
    db.update(portfolioTasks).set({ lastActivityAt: sql`(datetime('now'))` }).where(eq(portfolioTasks.rosterId, id)),
    notify(db, "member", id, input.kind === "feedback" ? "feedback" : "reply", me.name, `message:${msg.id}`),
    // Writing in a thread means this leader has seen it.
    db
      .insert(portfolioReads)
      .values({ rosterId: id, userId: me.id })
      .onConflictDoUpdate({ target: [portfolioReads.rosterId, portfolioReads.userId], set: { readAt: sql`(datetime('now'))` } }),
  ]);
  return c.json({ ok: true }, 201);
});

route.post(
  "/tasks/:id/review",
  body(
    z
      .object({ action: z.enum(["request_revisions", "approve"]), feedback: optionalMessageText(4000), seq: z.number().int().min(0) })
      .refine((v) => v.action !== "request_revisions" || v.feedback, { message: "Write what needs to change", path: ["feedback"] })
  ),
  async (c) => {
    const id = rosterId(c);
    const db = getDb(c.env);
    if (!id || !(await rosterExists(db, id))) return c.json({ error: "Member not found" }, 404);
    const me = c.get("user");
    const input = c.req.valid("json");
    const task = await getTask(db, id);
    if (input.seq !== task.seq) return c.json({ error: CHANGED }, 409);
    const next = statusAfterReview(task.status, input.action, task.corrections);
    if (!next) {
      return c.json(
        {
          error:
            input.action === "approve"
              ? "There's no portfolio to approve yet."
              : task.status === "awaiting_final_review"
                ? "The one final correction was already used. Approve it, or leave feedback in the thread."
                : "Revisions can only be requested while a portfolio is waiting for review.",
        },
        400
      );
    }
    const seq = task.seq + 1;
    const now = sql`(datetime('now'))`;
    const approved = next === "completed";
    const memberNotice = approved ? "approved" : task.status === "awaiting_initial_review" ? "revisions_requested" : "reviewed";
    try {
      await db.batch([
        db.insert(portfolioEvents).values({
          rosterId: id,
          seq,
          kind: approved ? "approved" : "revisions_requested",
          fromStatus: task.status,
          toStatus: next,
          actorId: me.id,
          actorName: me.name,
        }),
        db
          .update(portfolioTasks)
          .set({
            status: next,
            seq,
            ...(next === "final_correction_requested" ? { corrections: task.corrections + 1 } : {}),
            ...(approved ? { completedAt: now, completedBy: me.name } : {}),
            lastActivityAt: now,
            updatedAt: now,
          })
          .where(eq(portfolioTasks.rosterId, id)),
        db.insert(portfolioMessages).values({
          rosterId: id,
          authorId: me.id,
          authorName: me.name,
          authorRole: "leader",
          kind: approved ? "approval" : "revisions",
          body: input.feedback ?? "",
        }),
        notify(db, "member", id, memberNotice, me.name, `event:${id}:${seq}`),
      ]);
    } catch (err) {
      if (isDuplicate(err)) return c.json({ error: CHANGED }, 409);
      throw err;
    }
    return c.json({ ok: true, status: next });
  }
);

/* ---------- Deadlines ---------- */

const deadlineInput = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/, "Bad deadline id"),
  due: z.iso.datetime({ offset: true, message: "Pick a date and time" }),
  title: z.string().trim().max(80, "Keep the title under 80 characters").default(""),
  note: z.string().trim().max(300, "Keep the note under 300 characters").default(""),
  counts: z.enum(DEADLINE_COUNTS),
});

route.get("/deadlines", async (c) => c.json(await getDeadlines(getDb(c.env))));

// Saves the whole list at once. Deadlines only affect what's shown and how new
// submissions are measured: statuses, progress and past On time / Late flags never change.
route.put(
  "/deadlines",
  body(z.object({ items: z.array(deadlineInput).max(MAX_DEADLINES), closeAfterDeadline: z.boolean() })),
  async (c) => {
    const { items, closeAfterDeadline } = c.req.valid("json");
    const problem = checkDeadlines(items);
    if (problem) return c.json({ error: problem }, 400);
    const value = { items: sortDeadlines(items), closeAfterDeadline };
    await getDb(c.env)
      .insert(settings)
      .values({ key: DEADLINES_KEY, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: sql`(datetime('now'))` } });
    return c.json({ ok: true, ...value });
  }
);

/* ---------- Roster and access ---------- */

route.get("/access", async (c) => {
  const db = getDb(c.env);
  await matchCharacters(db);
  // Not db.batch(): batched rows come back keyed by column name, so the joined tables'
  // shared columns (name, email, id, created_at) would overwrite each other.
  const [members, events] = await Promise.all([
    db
      .select({
        id: roster.id,
        name: roster.name,
        email: roster.email,
        active: roster.active,
        memberId: roster.memberId,
        linkedAt: rosterLinks.linkedAt,
        accountName: users.name,
        accountEmail: users.email,
        accountImage: users.image,
      })
      .from(roster)
      .leftJoin(rosterLinks, eq(rosterLinks.rosterId, roster.id))
      .leftJoin(users, eq(users.id, rosterLinks.userId))
      .orderBy(asc(roster.name)),
    db
      .select({ id: accessEvents.id, kind: accessEvents.kind, rosterId: accessEvents.rosterId, name: roster.name, detail: accessEvents.detail, createdAt: accessEvents.createdAt })
      .from(accessEvents)
      .leftJoin(roster, eq(roster.id, accessEvents.rosterId))
      .orderBy(desc(accessEvents.id))
      .limit(200),
  ]);
  return c.json({ members, events });
});

const rosterRow = z.object({ name: requiredText(200).transform((n) => n.replace(/\s+/g, " ")), email: z.string().trim().max(254).email("Not a valid email") });

route.post("/roster/import", body(z.object({ rows: z.array(rosterRow).min(1).max(1000), deactivateMissing: z.boolean() })), async (c) => {
  const db = getDb(c.env);
  const { rows, deactivateMissing } = c.req.valid("json");
  const seen = new Set<string>();
  for (const r of rows) {
    const e = normalizeEmail(r.email);
    if (seen.has(e)) return c.json({ error: `${r.email} is in the file twice. Fix the sheet and import again.` }, 400);
    seen.add(e);
  }
  const existing = new Map((await db.select({ id: roster.id, email: roster.email, name: roster.name }).from(roster)).map((r) => [r.email, r]));
  const leader = c.get("user").name;
  const statements = [];
  let added = 0;
  let renamed = 0;
  for (const r of rows) {
    const email = normalizeEmail(r.email);
    const known = existing.get(email);
    if (!known) {
      statements.push(db.insert(roster).values({ name: r.name.trim(), email }));
      added++;
    } else if (known.name !== r.name.trim()) {
      // Existing members keep their id, link and history; only the name follows the sheet.
      statements.push(db.update(roster).set({ name: r.name.trim(), updatedAt: sql`(datetime('now'))` }).where(eq(roster.id, known.id)));
      renamed++;
    }
  }
  let deactivated = 0;
  if (deactivateMissing) {
    const missing = [...existing.values()].filter((r) => !seen.has(r.email));
    deactivated = missing.length;
    // In chunks: D1 takes at most 100 bound values per query.
    for (let i = 0; i < missing.length; i += 90) {
      const ids = missing.slice(i, i + 90).map((m) => m.id);
      statements.push(db.update(roster).set({ active: false, updatedAt: sql`(datetime('now'))` }).where(and(inArray(roster.id, ids), eq(roster.active, true))));
    }
    for (const m of missing) statements.push(db.insert(accessEvents).values({ kind: "blocked", rosterId: m.id, detail: `Not in the roster ${leader} imported` }));
  }
  if (statements.length) await db.batch(statements as [(typeof statements)[number], ...typeof statements]);
  await matchCharacters(db);
  return c.json({ ok: true, added, renamed, deactivated, unchanged: rows.length - added - renamed });
});

route.post("/roster", body(rosterRow), async (c) => {
  const { name, email } = c.req.valid("json");
  try {
    await getDb(c.env).insert(roster).values({ name, email: normalizeEmail(email) });
  } catch (err) {
    if (isDuplicate(err)) return c.json({ error: "That email is already on the roster." }, 409);
    throw err;
  }
  return c.json({ ok: true }, 201);
});

route.patch("/roster/:id", body(rosterRow.partial()), async (c) => {
  const id = rosterId(c);
  const db = getDb(c.env);
  if (!id) return c.json({ error: "Member not found" }, 404);
  const input = c.req.valid("json");
  const [row] = await db.select({ linked: rosterLinks.userId }).from(roster).leftJoin(rosterLinks, eq(rosterLinks.rosterId, roster.id)).where(eq(roster.id, id));
  if (!row) return c.json({ error: "Member not found" }, 404);
  // The email is what they proved; changing it under a live link would skip that proof.
  if (input.email && row.linked) return c.json({ error: "Unlink their account first: the email is what they verified." }, 400);
  try {
    await db
      .update(roster)
      .set({ ...(input.name ? { name: input.name } : {}), ...(input.email ? { email: normalizeEmail(input.email) } : {}), updatedAt: sql`(datetime('now'))` })
      .where(eq(roster.id, id));
  } catch (err) {
    if (isDuplicate(err)) return c.json({ error: "That email is already on the roster." }, 409);
    throw err;
  }
  return c.json({ ok: true });
});

route.post("/roster/:id/unlink", async (c) => {
  const id = rosterId(c);
  const db = getDb(c.env);
  if (!id) return c.json({ error: "Member not found" }, 404);
  const [link] = await db.select().from(rosterLinks).where(eq(rosterLinks.rosterId, id));
  if (!link) return c.json({ error: "No account is linked to this member." }, 400);
  // Their task, submissions and thread stay; the old login is signed out and loses access.
  await db.batch([
    db.delete(rosterLinks).where(eq(rosterLinks.rosterId, id)),
    db.delete(session).where(eq(session.userId, link.userId)),
    db.insert(accessEvents).values({ kind: "unlinked", rosterId: id, userId: link.userId, detail: `By ${c.get("user").name}` }),
  ]);
  return c.json({ ok: true });
});

route.post("/roster/:id/active", body(z.object({ active: z.boolean() })), async (c) => {
  const id = rosterId(c);
  const db = getDb(c.env);
  if (!id || !(await rosterExists(db, id))) return c.json({ error: "Member not found" }, 404);
  const { active } = c.req.valid("json");
  await db.batch([
    db.update(roster).set({ active, updatedAt: sql`(datetime('now'))` }).where(eq(roster.id, id)),
    db.insert(accessEvents).values({ kind: active ? "unblocked" : "blocked", rosterId: id, detail: `By ${c.get("user").name}` }),
  ]);
  return c.json({ ok: true });
});

/* ---------- Member sign-ins ---------- */

// The latest sign-in attempts by email: who, when, and the misses (emails not on the
// roster). Leaders only. The visitor's IP is kept for the guessing limit, never shown.
route.get("/signins", async (c) => {
  const rows = await getDb(c.env)
    .select({ id: memberSignins.id, email: memberSignins.email, ok: memberSignins.ok, createdAt: memberSignins.createdAt, rosterId: memberSignins.rosterId, name: roster.name })
    .from(memberSignins)
    .leftJoin(roster, eq(roster.id, memberSignins.rosterId))
    .orderBy(desc(memberSignins.id))
    .limit(100);
  return c.json({ signins: rows });
});

export default route;
