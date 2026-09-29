// Login (Better Auth): "Sign in with GitHub", sessions stored in D1.
// Anyone can sign in, but new accounts get role "member"; only "admin" can use
// the admin API. Promote someone with:
//   npx wrangler d1 execute pt-db --remote --command "UPDATE user SET role = 'admin' WHERE email = '…'"
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createMiddleware } from "hono/factory";
import { getDb, type AppEnv } from "./db/client";
import * as schema from "./db/schema";

export type Role = "admin" | "member";

export function createAuth(env: Env) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(env), { provider: "sqlite", schema }),
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
    },
    // Email + password exists only for local development (DEV_LOGIN in .dev.vars),
    // because the GitHub app can only send people back to the live site.
    emailAndPassword: { enabled: env.DEV_LOGIN === "true" },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "member", input: false },
      },
    },
  });
}

export type SessionUser = { id: string; name: string; email: string; image?: string | null; role: Role };

/** The signed-in user, or null. Read from the database every time, so role changes apply at once. */
export async function getUser(env: Env, headers: Headers): Promise<SessionUser | null> {
  const session = await createAuth(env).api.getSession({ headers });
  return (session?.user as SessionUser | undefined) ?? null;
}

/** Lets the request through only for signed-in users with one of the given roles. */
export const requireRole = (...roles: Role[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = await getUser(c.env, c.req.raw.headers);
    if (!user) return c.json({ error: "Sign in first" }, 401);
    if (!roles.includes(user.role)) return c.json({ error: "You don't have access to this" }, 403);
    c.set("user", user);
    await next();
  });
