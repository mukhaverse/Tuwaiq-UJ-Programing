// Admin: upload, list and delete files in R2. Files are public at /api/media/<key>.
import { Hono } from "hono";
import type { AppEnv } from "../../db/client";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /^(image\/(png|jpeg|webp|gif|svg\+xml|avif)|application\/pdf)$/;

// "My Photo (1).PNG" → "my-photo-1.png"
const safeName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80) || "file";

const route = new Hono<AppEnv>();

route.get("/", async (c) => {
  const listed = await c.env.MEDIA.list({ limit: 500, include: ["httpMetadata"] });
  const files = listed.objects
    .map((o) => ({ key: o.key, size: o.size, type: o.httpMetadata?.contentType ?? "", uploaded: o.uploaded.toISOString(), url: `/api/media/${o.key}` }))
    .sort((a, b) => b.uploaded.localeCompare(a.uploaded));
  return c.json({ files });
});

route.post("/", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return c.json({ error: "Choose a file to upload" }, 400);
  if (!ALLOWED.test(file.type)) return c.json({ error: "Only images (PNG, JPG, WebP, GIF, SVG, AVIF) and PDFs" }, 400);
  if (file.size > MAX_BYTES) return c.json({ error: "Files can be up to 10 MB" }, 400);
  const key = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID().slice(0, 8)}-${safeName(file.name)}`;
  await c.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
  return c.json({ ok: true, key, url: `/api/media/${key}` }, 201);
});

route.delete("/*", async (c) => {
  const key = c.req.path.replace(/^\/api\/admin\/uploads\//, "");
  await c.env.MEDIA.delete(decodeURIComponent(key));
  return c.json({ ok: true });
});

export default route;
