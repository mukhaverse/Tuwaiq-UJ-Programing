// Who's looking at the portfolio task:
//
//   GET  /api/portfolio/session        guest | unverified | blocked | member | leader
//
// Members sign in with the email they registered with (lib/memberSignIn.ts). The routes
// below are an earlier way, an emailed one-time code. They're kept but answer 404 unless
// MEMBER_VERIFY=email_code (see emailCodesOn in auth.ts):
//
//   POST /api/portfolio/verify/start   { email }  → emails a one-time code if that email is
//                                      an active, unlinked roster member (same answer either way)
//   POST /api/portfolio/verify/confirm { code }   → links this login to that member
//
// A code is 6 digits, kept only as a keyed hash, valid for 10 minutes, single use, and
// allows 5 tries. Asking for codes is capped per login, per roster member and (in
// worker/index.ts) per visitor.
import { Hono } from "hono";
import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { emailCodesOn, getUser, isLeader, linkedMember, memberSignupOpen } from "../../auth";
import { getDb, type AppEnv } from "../../db/client";
import { accessEvents, emailCodes, notificationReads, notifications, portfolioTasks, roster, rosterLinks } from "../../db/schema";
import { sendEmail } from "../../lib/email";
import { normalizeEmail } from "../../../src/data/portfolio";
import { body, isDuplicate } from "../admin/shared";

const CODE_MINUTES = 10;
const MAX_TRIES = 5;
const CODES_PER_USER_PER_HOUR = 5;
const CODES_PER_MEMBER_PER_DAY = 6;

const route = new Hono<AppEnv>();

/** Unread notifications for this person. */
export async function unreadCount(env: Env, userId: string, scope: { audience: "leaders" } | { audience: "member"; rosterId: number }) {
  const db = getDb(env);
  const notRead = sql`NOT EXISTS (SELECT 1 FROM ${notificationReads} r WHERE r.notification_id = ${notifications.id} AND r.user_id = ${userId})`;
  const where =
    scope.audience === "leaders"
      ? and(eq(notifications.audience, "leaders"), notRead)
      : and(eq(notifications.audience, "member"), eq(notifications.rosterId, scope.rosterId), notRead);
  const [row] = await db.select({ n: count() }).from(notifications).where(where);
  return row?.n ?? 0;
}

route.get("/session", async (c) => {
  c.header("Cache-Control", "private, no-store");
  const signupOpen = memberSignupOpen(c.env);
  const user = await getUser(c.env, c.req.raw.headers);
  if (!user) return c.json({ kind: "guest", signupOpen });
  const who = { name: user.name, image: user.image ?? null };
  if (await isLeader(c.env, user)) {
    return c.json({ kind: "leader", ...who, unread: await unreadCount(c.env, user.id, { audience: "leaders" }) });
  }
  const member = await linkedMember(c.env, user.id);
  if (member && !member.active) return c.json({ kind: "blocked", ...who });
  if (member) {
    return c.json({
      kind: "member",
      ...who,
      memberName: member.name,
      // Their public member card (a slug), for drawing their character. Never an email.
      memberId: member.memberId,
      unread: await unreadCount(c.env, user.id, { audience: "member", rosterId: member.id }),
    });
  }
  return c.json({ kind: "unverified", ...who, signupOpen, emailCodes: emailCodesOn(c.env) });
});

/* ---------- Codes ---------- */

function randomCode() {
  const a = new Uint32Array(1);
  // Rejection sampling, so every 6-digit code is equally likely.
  do crypto.getRandomValues(a);
  while (a[0] >= 4_294_000_000);
  return String(a[0] % 1_000_000).padStart(6, "0");
}

/** HMAC of the code, keyed with the auth secret and bound to the login that asked for it. */
async function hashCode(env: Env, userId: string, code: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.BETTER_AUTH_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`portfolio-code:${userId}:${code}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameHash(a: string, b: string) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  return x.length === y.length && crypto.subtle.timingSafeEqual(x, y);
}

const GENERIC =
  "If that email belongs to a Programming Track member who hasn't linked an account yet, a 6-digit code is on its way to it. It can take a minute; check your spam folder too.";

/** Signed-in, not a leader, not linked yet: the only people who verify. */
async function verifier(env: Env, headers: Headers) {
  const user = await getUser(env, headers);
  if (!user) return { error: "Sign in with GitHub first", status: 401 as const };
  if (await isLeader(env, user)) return { error: "Leaders don't need to verify a member email", status: 400 as const };
  if (await linkedMember(env, user.id)) return { error: "This account is already linked to a member", status: 400 as const };
  return { user };
}

route.post("/verify/start", body(z.object({ email: z.string().trim().max(254).email("Enter the email you registered with") })), async (c) => {
  c.header("Cache-Control", "private, no-store");
  if (!emailCodesOn(c.env)) return c.json({ error: "Not found" }, 404);
  const v = await verifier(c.env, c.req.raw.headers);
  if ("error" in v) return c.json({ error: v.error }, v.status);
  const { user } = v;
  const db = getDb(c.env);
  const email = normalizeEmail(c.req.valid("json").email);
  const who = `${user.name} (${user.email})`;

  const [[mine]] = await db.batch([
    db.select({ n: count() }).from(emailCodes).where(and(eq(emailCodes.userId, user.id), gt(emailCodes.createdAt, sql`datetime('now', '-1 hour')`))),
  ]);
  if (mine.n >= CODES_PER_USER_PER_HOUR) return c.json({ error: "You've asked for a lot of codes. Wait an hour and try again." }, 429);

  const [member] = await db
    .select({ id: roster.id, active: roster.active, linked: rosterLinks.userId })
    .from(roster)
    .leftJoin(rosterLinks, eq(rosterLinks.rosterId, roster.id))
    .where(eq(roster.email, email));

  // From here on the answer is the same whatever happens, so nobody can use this form
  // to find out who's on the roster or who has already linked an account.
  if (!member || !member.active) {
    await db.insert(accessEvents).values({ kind: "not_on_roster", userId: user.id, detail: `${who} entered ${email}` });
    return c.json({ ok: true, message: GENERIC });
  }
  if (member.linked) {
    await db.insert(accessEvents).values({ kind: "already_linked", rosterId: member.id, userId: user.id, detail: `${who} asked for a code` });
    return c.json({ ok: true, message: GENERIC });
  }
  const [forMember] = await db
    .select({ n: count() })
    .from(emailCodes)
    .where(and(eq(emailCodes.rosterId, member.id), gt(emailCodes.createdAt, sql`datetime('now', '-1 day')`)));
  if (forMember.n >= CODES_PER_MEMBER_PER_DAY) return c.json({ ok: true, message: GENERIC });

  const code = randomCode();
  // Any earlier code this login asked for stops working.
  await db.batch([
    db.update(emailCodes).set({ usedAt: sql`(datetime('now'))` }).where(and(eq(emailCodes.userId, user.id), isNull(emailCodes.usedAt))),
    db.insert(emailCodes).values({
      userId: user.id,
      rosterId: member.id,
      codeHash: await hashCode(c.env, user.id, code),
      expiresAt: sql`(datetime('now', '+${sql.raw(String(CODE_MINUTES))} minutes'))`,
    }),
  ]);

  // Sent after answering, so the answer takes as long as the "not on the roster" one.
  const send = sendEmail(c.env, {
    to: email,
    subject: `${code} is your Programming Track code`,
    text: `Your code is ${code}\n\nEnter it on the Programming Track site to link the GitHub account "${user.name}" to your membership and open your Portfolio Task. It works once and expires in ${CODE_MINUTES} minutes.\n\nDidn't ask for this? Ignore this email: nothing is linked without the code. If it keeps happening, tell a track leader.`,
    html: `<p>Your code is</p><p style="font:700 28px monospace;letter-spacing:4px">${code}</p><p>Enter it on the Programming Track site to link the GitHub account <strong>${escapeHtml(user.name)}</strong> to your membership and open your Portfolio Task. It works once and expires in ${CODE_MINUTES} minutes.</p><p style="color:#666">Didn't ask for this? Ignore this email: nothing is linked without the code. If it keeps happening, tell a track leader.</p>`,
  }).catch(async (err) => {
    console.error("Portfolio code email failed", err);
    await db.insert(accessEvents).values({ kind: "email_failed", rosterId: member.id, userId: user.id, detail: String(err?.message ?? err).slice(0, 300) });
  });
  c.executionCtx.waitUntil(send);
  return c.json({ ok: true, message: GENERIC });
});

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

route.post("/verify/confirm", body(z.object({ code: z.string().trim().regex(/^\d{6}$/, "The code is 6 digits") })), async (c) => {
  c.header("Cache-Control", "private, no-store");
  if (!emailCodesOn(c.env)) return c.json({ error: "Not found" }, 404);
  const v = await verifier(c.env, c.req.raw.headers);
  if ("error" in v) return c.json({ error: v.error }, v.status);
  const { user } = v;
  const db = getDb(c.env);
  const expired = "That code has expired or was replaced. Ask for a new one.";

  const [pending] = await db
    .select()
    .from(emailCodes)
    .where(and(eq(emailCodes.userId, user.id), isNull(emailCodes.usedAt), gt(emailCodes.expiresAt, sql`datetime('now')`)))
    .orderBy(desc(emailCodes.id))
    .limit(1);
  if (!pending) return c.json({ error: expired }, 400);

  // Count the try first, atomically, so parallel guesses can't get past the limit.
  const counted = await db
    .update(emailCodes)
    .set({ attempts: sql`${emailCodes.attempts} + 1` })
    .where(and(eq(emailCodes.id, pending.id), isNull(emailCodes.usedAt), sql`${emailCodes.attempts} < ${MAX_TRIES}`))
    .returning({ attempts: emailCodes.attempts });
  if (!counted.length) {
    await db.batch([
      db.update(emailCodes).set({ usedAt: sql`(datetime('now'))` }).where(eq(emailCodes.id, pending.id)),
      db.insert(accessEvents).values({ kind: "too_many_tries", rosterId: pending.rosterId, userId: user.id, detail: `${user.name} (${user.email})` }),
    ]);
    return c.json({ error: "Too many wrong tries. Ask for a new code." }, 429);
  }

  if (!sameHash(await hashCode(c.env, user.id, c.req.valid("json").code), pending.codeHash)) {
    const left = MAX_TRIES - counted[0].attempts;
    if (left <= 0) {
      await db.batch([
        db.update(emailCodes).set({ usedAt: sql`(datetime('now'))` }).where(eq(emailCodes.id, pending.id)),
        db.insert(accessEvents).values({ kind: "too_many_tries", rosterId: pending.rosterId, userId: user.id, detail: `${user.name} (${user.email})` }),
      ]);
      return c.json({ error: "Too many wrong tries. Ask for a new code." }, 429);
    }
    return c.json({ error: `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` }, 400);
  }

  // Right code: use it up and link, all or nothing. The unique keys on roster_links
  // refuse a member who's already linked, or a login that's already linked to someone.
  const [member] = await db.select({ active: roster.active }).from(roster).where(eq(roster.id, pending.rosterId));
  if (!member?.active) return c.json({ error: expired }, 400);
  try {
    await db.batch([
      db.update(emailCodes).set({ usedAt: sql`(datetime('now'))` }).where(eq(emailCodes.id, pending.id)),
      db.insert(rosterLinks).values({ rosterId: pending.rosterId, userId: user.id }),
      db.insert(portfolioTasks).values({ rosterId: pending.rosterId }).onConflictDoNothing(),
      db.insert(accessEvents).values({ kind: "linked", rosterId: pending.rosterId, userId: user.id, detail: `${user.name} (${user.email})` }),
    ]);
  } catch (err) {
    if (!isDuplicate(err)) throw err;
    await db.batch([
      db.update(emailCodes).set({ usedAt: sql`(datetime('now'))` }).where(eq(emailCodes.id, pending.id)),
      db.insert(accessEvents).values({ kind: "already_linked", rosterId: pending.rosterId, userId: user.id, detail: `${user.name} (${user.email}) had the right code` }),
    ]);
    return c.json({ error: "This membership is already linked to another account. If that's wrong, ask a track leader to help you relink." }, 409);
  }
  return c.json({ ok: true });
});

export default route;
