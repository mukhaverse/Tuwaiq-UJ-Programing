// Login (Better Auth), sessions stored in D1.
//
// Who can sign in:
//   - with GitHub: only the accounts in ADMIN_GITHUB_IDS (the admin panel) and
//     LEADER_GITHUB_IDS (the portfolio task's leaders), both in wrangler.jsonc. Anyone
//     else is turned away before an account or session is created;
//   - members of the portfolio task: with the email they registered with in the club,
//     while MEMBER_SIGNUP=true (lib/memberSignIn.ts, POST /api/auth/member/sign-in).
// A GitHub account's numeric id never changes (unlike its username or email); find
// one at https://api.github.com/users/<username> ("id").
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { github } from "better-auth/social-providers";
import { and, eq, ne } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { getDb, type AppEnv } from "./db/client";
import * as schema from "./db/schema";
import { devLogin, emailProvider } from "./lib/email";
import { memberSignIn } from "./lib/memberSignIn";

export { devLogin };

export type Role = "admin" | "member";

const idList = (value: string | undefined) =>
  new Set(
    (value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
const adminIds = (env: Env) => idList(env.ADMIN_GITHUB_IDS);
const leaderIds = (env: Env) => idList(env.LEADER_GITHUB_IDS);

/** Members can sign in with their roster email only while this is switched on. */
export const memberSignupOpen = (env: Env) => env.MEMBER_SIGNUP === "true";

/**
 * The earlier sign-up by an emailed one-time code. Kept, but off unless MEMBER_VERIFY is
 * "email_code" (and email is set up).
 */
export const emailCodesOn = (env: Env) => memberSignupOpen(env) && String(env.MEMBER_VERIFY ?? "") === "email_code" && emailProvider(env) !== null;

async function accountsOf(env: Env, userId: string) {
  return getDb(env)
    .select({ providerId: schema.account.providerId, accountId: schema.account.accountId })
    .from(schema.account)
    .where(eq(schema.account.userId, userId));
}

/** True when this user signed in with an admin GitHub account (or is a local dev account). */
async function isAllowed(env: Env, userId: string) {
  const ids = adminIds(env);
  const accounts = await accountsOf(env, userId);
  return accounts.some((a) => (a.providerId === "github" && ids.has(a.accountId)) || (a.providerId === "credential" && devLogin(env)));
}

/**
 * True when this user is one of the portfolio task's leaders: a GitHub account in
 * LEADER_GITHUB_IDS. Locally (DEV_LOGIN), an email + password account with the admin
 * role counts too, so the leader side can be tried without GitHub.
 */
export async function isLeader(env: Env, user: { id: string; role?: string }) {
  const ids = leaderIds(env);
  const accounts = await accountsOf(env, user.id);
  return accounts.some(
    (a) => (a.providerId === "github" && ids.has(a.accountId)) || (a.providerId === "credential" && devLogin(env) && user.role === "admin")
  );
}

/** True when this user's login is linked to a roster member. */
async function isLinked(env: Env, userId: string) {
  const [row] = await getDb(env).select({ id: schema.rosterLinks.rosterId }).from(schema.rosterLinks).where(eq(schema.rosterLinks.userId, userId));
  return Boolean(row);
}

/** May this GitHub account sign in? Admins and leaders only; checked before anything is written. */
function githubMaySignIn(env: Env, githubId: string) {
  return adminIds(env).has(githubId) || leaderIds(env).has(githubId);
}

/** May this (already created) user get a session? */
async function userMayHaveSession(env: Env, userId: string) {
  if (await isAllowed(env, userId)) return true;
  const accounts = await accountsOf(env, userId);
  if (accounts.some((a) => a.providerId === "github" && leaderIds(env).has(a.accountId))) return true;
  // Members: the email sign-in links the login to the roster before asking for a session.
  return isLinked(env, userId);
}

export function createAuth(env: Env) {
  const githubOptions = { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET };
  const githubDefault = github(githubOptions);

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [new URL(env.BETTER_AUTH_URL).origin],
    database: drizzleAdapter(getDb(env), { provider: "sqlite", schema }),
    socialProviders: {
      github: {
        ...githubOptions,
        // Ask GitHub who this is, and stop right there unless they may sign in:
        // nothing is written to the database for anyone else.
        getUserInfo: async (token) => {
          const info = await githubDefault.getUserInfo(token);
          return info && githubMaySignIn(env, String(info.data.id)) ? info : null;
        },
      },
    },
    emailAndPassword: { enabled: devLogin(env) },
    plugins: [memberSignIn(env, { open: () => memberSignupOpen(env) })],
    // Never join a new login onto an existing user just because the emails match.
    account: { accountLinking: { enabled: false } },
    // Short sessions: a day, renewed while in use.
    session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60 },
    advanced: {
      useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    databaseHooks: {
      // Second lock: no session for anyone who may not sign in, whatever route they came in by.
      // One session at a time: signing in ends every other one for that account, so a
      // forgotten browser (or one someone else got into) is logged out by the next sign-in.
      session: {
        create: {
          before: async (session) => ((await userMayHaveSession(env, session.userId)) ? undefined : false),
          after: async (session) => {
            await getDb(env)
              .delete(schema.session)
              .where(and(eq(schema.session.userId, session.userId), ne(schema.session.id, session.id)));
          },
        },
      },
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "member", input: false },
      },
    },
  });
}

export type SessionUser = { id: string; name: string; email: string; image?: string | null; role: Role };

/** The signed-in user, or null. Read from the database every time, so changes apply at once. */
export async function getUser(env: Env, headers: Headers): Promise<SessionUser | null> {
  const session = await createAuth(env).api.getSession({ headers });
  return (session?.user as SessionUser | undefined) ?? null;
}

/** Lets the request through only for admins (checked on every request). */
export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = await getUser(c.env, c.req.raw.headers);
  if (!user) return c.json({ error: "Sign in first" }, 401);
  if (user.role !== "admin" || !(await isAllowed(c.env, user.id))) return c.json({ error: "You don't have access to this" }, 403);
  c.set("user", user);
  await next();
});

/** Lets the request through only for the portfolio task's leaders (checked on every request). */
export const requireLeader = createMiddleware<AppEnv>(async (c, next) => {
  const user = await getUser(c.env, c.req.raw.headers);
  if (!user) return c.json({ error: "Sign in first" }, 401);
  if (!(await isLeader(c.env, user))) return c.json({ error: "You don't have access to this" }, 403);
  c.set("user", user);
  await next();
});

/** The roster member this user is linked to, if the link exists and the member is active. */
export async function linkedMember(env: Env, userId: string) {
  const [row] = await getDb(env)
    .select({ id: schema.roster.id, name: schema.roster.name, active: schema.roster.active, memberId: schema.roster.memberId })
    .from(schema.rosterLinks)
    .innerJoin(schema.roster, eq(schema.roster.id, schema.rosterLinks.rosterId))
    .where(eq(schema.rosterLinks.userId, userId));
  return row ?? null;
}

/** Lets the request through only for a verified, active roster member, and notes which one. */
export const requireMember = createMiddleware<AppEnv>(async (c, next) => {
  const user = await getUser(c.env, c.req.raw.headers);
  if (!user) return c.json({ error: "Sign in first" }, 401);
  const member = await linkedMember(c.env, user.id);
  if (!member || !member.active) return c.json({ error: "You don't have access to this" }, 403);
  c.set("user", user);
  c.set("member", { id: member.id, name: member.name, memberId: member.memberId });
  await next();
});
