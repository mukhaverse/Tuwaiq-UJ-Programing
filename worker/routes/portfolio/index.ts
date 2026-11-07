// /api/portfolio: the "Build Your Portfolio" task. Private throughout: every answer is
// for the signed-in person only and never cached.
//
//   account.ts  /session, /verify/*   who's looking; proving a roster email
//   member.ts   /me/*                 a verified member's own task
//   leader.ts   /leader/*             the leaders' dashboard, reviews, deadlines, access
//   here        /notifications        the signed-in person's own notifications
import { Hono } from "hono";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { getUser, isLeader, linkedMember } from "../../auth";
import { getDb, type AppEnv } from "../../db/client";
import { notificationReads, notifications, roster } from "../../db/schema";
import { body } from "../admin/shared";
import account from "./account";
import leader from "./leader";
import member from "./member";

const portfolio = new Hono<AppEnv>();

portfolio.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "private, no-store");
});

portfolio.route("/", account);
portfolio.route("/me", member);
portfolio.route("/leader", leader);

/** Whose notifications these are: every leader's shared list, or one member's own. */
async function audienceOf(env: Env, headers: Headers) {
  const user = await getUser(env, headers);
  if (!user) return null;
  if (await isLeader(env, user)) return { user, where: eq(notifications.audience, "leaders") };
  const m = await linkedMember(env, user.id);
  if (!m || !m.active) return null;
  return { user, where: and(eq(notifications.audience, "member"), eq(notifications.rosterId, m.id)) };
}

portfolio.get("/notifications", async (c) => {
  const who = await audienceOf(c.env, c.req.raw.headers);
  if (!who) return c.json({ error: "You don't have access to this" }, 403);
  const rows = await getDb(c.env)
    .select({
      id: notifications.id,
      kind: notifications.kind,
      rosterId: notifications.rosterId,
      memberName: roster.name,
      actorName: notifications.actorName,
      createdAt: notifications.createdAt,
      read: sql<number>`EXISTS (SELECT 1 FROM ${notificationReads} r WHERE r.notification_id = ${notifications.id} AND r.user_id = ${who.user.id})`,
    })
    .from(notifications)
    .innerJoin(roster, eq(roster.id, notifications.rosterId))
    .where(who.where)
    .orderBy(desc(notifications.id))
    .limit(60);
  return c.json({ notifications: rows.map((r) => ({ ...r, read: Boolean(r.read) })) });
});

// Marks some (ids) or all of this person's notifications read, for them alone.
portfolio.post("/notifications/read", body(z.object({ ids: z.array(z.number().int().positive()).max(90).optional() })), async (c) => {
  const who = await audienceOf(c.env, c.req.raw.headers);
  if (!who) return c.json({ error: "You don't have access to this" }, 403);
  const { ids } = c.req.valid("json");
  const db = getDb(c.env);
  const mine = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(ids ? and(who.where, inArray(notifications.id, ids)) : who.where);
  // Only ids from this person's own list, whatever was sent.
  for (let i = 0; i < mine.length; i += 45) {
    const chunk = mine.slice(i, i + 45);
    await db
      .insert(notificationReads)
      .values(chunk.map((n) => ({ notificationId: n.id, userId: who.user.id })))
      .onConflictDoNothing();
  }
  return c.json({ ok: true });
});

export default portfolio;
