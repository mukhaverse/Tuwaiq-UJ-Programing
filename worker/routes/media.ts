// GET /api/media/<key>: public files uploaded from the admin panel (stored in R2).
import { Hono } from "hono";
import type { AppEnv } from "../db/client";

const media = new Hono<AppEnv>();

media.get("/*", async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/media\//, ""));
  const object = await c.env.MEDIA.get(key);
  if (!object) return c.json({ error: "Not found" }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  // Keys are unique per upload, so a file never changes: cache it for a long time.
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  // SVGs can carry scripts; never let one run as a page on this site.
  headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
});

export default media;
