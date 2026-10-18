// The Worker: every /api/* request lands here. Everything else is served
// straight from the built site (see "assets" in wrangler.jsonc).
// A new feature is a new file in routes/, mounted below.
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import { createAuth, getUser } from "./auth";
import type { AppEnv } from "./db/client";
import { rateLimit, sameOrigin } from "./lib/guard";
import admin from "./routes/admin";
import bios from "./routes/bios";
import content from "./routes/content";
import media from "./routes/media";
import requests from "./routes/requests";

const app = new Hono<AppEnv>().basePath("/api");

// API answers are data, never pages: no framing, no sniffing, no running as HTML.
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    crossOriginResourcePolicy: "same-origin",
    strictTransportSecurity: "max-age=31536000; includeSubDomains",
  })
);
// Bodies bigger than the largest upload are refused before they're read.
app.use("*", bodyLimit({ maxSize: 11 * 1024 * 1024, onError: (c) => c.json({ error: "That's too big" }, 413) }));

// Public
app.route("/content", content);
app.route("/media", media);
app.use("/requests/*", sameOrigin, rateLimit("RL_WRITES", "requests"));
app.route("/requests", requests);
app.use("/bios/*", sameOrigin, rateLimit("RL_WRITES", "bios"));
app.route("/bios", bios);
app.get("/health", (c) => c.json({ ok: true }));

// Login: sign in with GitHub, sign out, sessions (handled by Better Auth).
app.use("/auth/*", sameOrigin, rateLimit("RL_AUTH", "auth"));
app.on(["GET", "POST"], "/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

// Who's signed in (null when nobody is). The admin panel starts here.
app.get("/me", async (c) => {
  c.header("Cache-Control", "no-store");
  const user = await getUser(c.env, c.req.raw.headers);
  return c.json({ user: user && { name: user.name, email: user.email, image: user.image, role: user.role } });
});

// Admin only
app.use("/admin/*", sameOrigin);
app.route("/admin", admin);

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  // Deliberate refusals (e.g. the cross-site check) keep their status code.
  if (err instanceof HTTPException) return c.json({ error: err.message || "Request refused" }, err.status);
  console.error(err);
  return c.json({ error: "Something went wrong" }, 500);
});

export default app;
