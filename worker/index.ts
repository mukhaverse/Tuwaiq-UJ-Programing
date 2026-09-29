// The Worker: every /api/* request lands here. Everything else is served
// straight from the built site (see "assets" in wrangler.jsonc).
// A new feature is a new file in routes/, mounted below.
import { Hono } from "hono";
import type { AppEnv } from "./db/client";
import content from "./routes/content";

const app = new Hono<AppEnv>().basePath("/api");

app.route("/content", content);

app.get("/health", (c) => c.json({ ok: true }));

app.notFound((c) => c.json({ error: "Not found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Something went wrong" }, 500);
});

export default app;
