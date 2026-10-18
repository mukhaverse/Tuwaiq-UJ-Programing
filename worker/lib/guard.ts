// Request guards shared by the routes: same-site checks and per-visitor rate limits.
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../db/client";

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Turns away writes that don't come from this site's own pages. Browsers always
 * send Origin on these, so another site can't make a visitor's browser post here
 * (with or without their login cookie). Stricter than hono's csrf(), which only
 * looks at form posts.
 */
export const sameOrigin = createMiddleware<AppEnv>(async (c, next) => {
  if (UNSAFE.has(c.req.method)) {
    const origin = c.req.header("origin");
    if (!origin || origin !== new URL(c.env.BETTER_AUTH_URL).origin) return c.json({ error: "Request refused" }, 403);
  }
  await next();
});

/**
 * Limits how often one visitor (by IP) can hit a route, using a Cloudflare rate
 * limiter from wrangler.jsonc. `bucket` keeps routes that share a limiter apart.
 */
export const rateLimit = (limiter: keyof Pick<Env, "RL_WRITES" | "RL_AUTH">, bucket: string) =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (UNSAFE.has(c.req.method)) {
      const ip = c.req.header("cf-connecting-ip") ?? "local";
      const { success } = await c.env[limiter].limit({ key: `${bucket}:${ip}` });
      if (!success) return c.json({ error: "Too many tries. Wait a minute and try again." }, 429);
    }
    await next();
  });
