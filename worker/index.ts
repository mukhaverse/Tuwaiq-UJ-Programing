// The Worker: every /api/* request lands here. Everything else is served
// straight from the built site (see "assets" in wrangler.jsonc).
// A new feature is a new file in routes/, mounted below.
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createAuth, getUser } from "./auth";
import type { AppEnv } from "./db/client";
import admin from "./routes/admin";
import content from "./routes/content";
import media from "./routes/media";
import requests from "./routes/requests";

const app = new Hono<AppEnv>().basePath("/api");

// Public
app.route("/content", content);
app.route("/media", media);
app.route("/requests", requests);
app.get("/health", (c) => c.json({ ok: true }));

// Login: sign in with GitHub, sign out, sessions (handled by Better Auth).
app.on(["GET", "POST"], "/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

// Who's signed in (null when nobody is). The admin panel starts here.
app.get("/me", async (c) => {
  c.header("Cache-Control", "no-store");
  const user = await getUser(c.env, c.req.raw.headers);
  return c.json({ user: user && { name: user.name, email: user.email, image: user.image, role: user.role } });
});

// Admin only
app.route("/admin", admin);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  // Deliberate refusals (e.g. the cross-site check) keep their status code.
  if (err instanceof HTTPException) return c.json({ error: err.message || "Request refused" }, err.status);
  console.error(err);
  return c.json({ error: "Something went wrong" }, 500);
});

export default app;
