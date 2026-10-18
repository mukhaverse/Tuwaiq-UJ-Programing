// Login (Better Auth): "Sign in with GitHub", sessions stored in D1.
// Only the GitHub accounts listed in ADMIN_GITHUB_IDS (wrangler.jsonc) can sign in
// at all: anyone else is turned away before an account or session is created.
// A GitHub account's numeric id never changes (unlike its username or email); find
// yours at https://api.github.com/users/<username> ("id").
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { github } from "better-auth/social-providers";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { getDb, type AppEnv } from "./db/client";
import * as schema from "./db/schema";

export type Role = "admin" | "member";

const allowedIds = (env: Env) =>
  new Set(
    (env.ADMIN_GITHUB_IDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );

// Email + password sign-in, for local development only (DEV_LOGIN in .dev.vars),
// because the GitHub app can only send people back to the live site. It stays off
// unless the site itself runs on localhost, even if DEV_LOGIN is set by mistake.
export const devLogin = (env: Env) => env.DEV_LOGIN === "true" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(env.BETTER_AUTH_URL);

/** True when this user signed in with an allowed GitHub account (or is a local dev account). */
async function isAllowed(env: Env, userId: string) {
  const db = getDb(env);
  const ids = allowedIds(env);
  const accounts = await db
    .select({ providerId: schema.account.providerId, accountId: schema.account.accountId })
    .from(schema.account)
    .where(eq(schema.account.userId, userId));
  return accounts.some((a) => (a.providerId === "github" && ids.has(a.accountId)) || (a.providerId === "credential" && devLogin(env)));
}

export function createAuth(env: Env) {
  const ids = allowedIds(env);
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
        // Ask GitHub who this is, and stop right there unless it's an allowed account:
        // nothing is written to the database for anyone else.
        getUserInfo: async (token) => {
          const info = await githubDefault.getUserInfo(token);
          return info && ids.has(String(info.data.id)) ? info : null;
        },
      },
    },
    emailAndPassword: { enabled: devLogin(env) },
    // Never join a new login onto an existing user just because the emails match.
    account: { accountLinking: { enabled: false } },
    // Short sessions: a day, renewed while in use.
    session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60 },
    advanced: {
      useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
    databaseHooks: {
      // Second lock: no session for anyone outside the list, whatever route they came in by.
      session: { create: { before: async (session) => (await isAllowed(env, session.userId)) ? undefined : false } },
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
