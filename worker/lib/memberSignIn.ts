// Member sign-in for the portfolio task: the member types the email they registered with
// in the club. If it's on the roster (trimmed, lowercased) and active, they're signed in
// with an ordinary session cookie; if not, the answer is only "we couldn't find your
// account". No code and no GitHub. Leaders keep signing in with GitHub (auth.ts).
//
//   POST /api/auth/member/sign-in   { email }
//
// Guessing is slowed down three ways: the RL_MEMBER_SIGNIN limit per visitor (index.ts),
// a cap on misses per visitor per hour (here), and every attempt is logged for the leaders
// (member_signins → dashboard → Sign-ins).
//
// Each roster member gets a login (a `user` row) the first time they sign in, linked to
// their roster entry. Its email field is a placeholder, so the roster email isn't copied
// into the login tables.
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import * as schema from "../db/schema";
import { normalizeEmail } from "../../src/data/portfolio";

export const NOT_FOUND = "We couldn't find your account. Contact a track leader.";
const MISSES_PER_HOUR = 15;

export function memberSignIn(env: Env, opts: { open: () => boolean }): BetterAuthPlugin {
  return {
    id: "member-sign-in",
    endpoints: {
      memberSignIn: createAuthEndpoint(
        "/member/sign-in",
        { method: "POST", body: z.object({ email: z.string().trim().min(3).max(254) }) },
        async (ctx) => {
          if (!opts.open()) throw new APIError("FORBIDDEN", { message: "Member sign-in isn't open yet." });
          const db = getDb(env);
          const email = normalizeEmail(ctx.body.email);
          const ip = ctx.request?.headers.get("cf-connecting-ip") ?? "local";

          const [misses] = await db
            .select({ n: count() })
            .from(schema.memberSignins)
            .where(and(eq(schema.memberSignins.ip, ip), eq(schema.memberSignins.ok, false), gt(schema.memberSignins.createdAt, sql`datetime('now', '-1 hour')`)));
          if (misses.n >= MISSES_PER_HOUR) throw new APIError("TOO_MANY_REQUESTS", { message: "Too many tries. Wait an hour and try again." });

          const [member] = await db
            .select({ id: schema.roster.id, name: schema.roster.name, linkedUser: schema.rosterLinks.userId })
            .from(schema.roster)
            .leftJoin(schema.rosterLinks, eq(schema.rosterLinks.rosterId, schema.roster.id))
            .where(and(eq(schema.roster.email, email), eq(schema.roster.active, true)));
          if (!member) {
            await db.insert(schema.memberSignins).values({ email, ok: false, ip });
            throw new APIError("NOT_FOUND", { message: NOT_FOUND });
          }

          const userId = member.linkedUser ?? (await createMemberLogin(env, member.id, member.name));
          const session = await ctx.context.internalAdapter.createSession(userId);
          const [user] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
          if (!session || !user) throw new APIError("INTERNAL_SERVER_ERROR", { message: "Couldn't sign you in. Try again." });
          await setSessionCookie(ctx, { session, user: user as never });
          await db.insert(schema.memberSignins).values({ rosterId: member.id, email, ok: true, ip });
          return ctx.json({ ok: true });
        }
      ),
    },
  };
}

/** The login for a roster member's first sign-in, linked to them. Safe if two race. */
async function createMemberLogin(env: Env, rosterId: number, name: string) {
  const db = getDb(env);
  const id = crypto.randomUUID();
  try {
    await db.batch([
      db.insert(schema.user).values({ id, name, email: `member-${rosterId}-${id.slice(0, 8)}@roster.invalid`, emailVerified: false, role: "member" }),
      db.insert(schema.rosterLinks).values({ rosterId, userId: id }),
      db.insert(schema.portfolioTasks).values({ rosterId }).onConflictDoNothing(),
      db.insert(schema.accessEvents).values({ kind: "linked", rosterId, userId: id, detail: "First sign-in with their email" }),
    ]);
    return id;
  } catch (err) {
    // Another sign-in for the same member got there first: use that login.
    if (!String((err as Error)?.message ?? err).includes("UNIQUE")) throw err;
    const [link] = await db.select({ userId: schema.rosterLinks.userId }).from(schema.rosterLinks).where(eq(schema.rosterLinks.rosterId, rosterId));
    if (!link) throw err;
    return link.userId;
  }
}
