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

/** The file's real type, read from its first bytes (the browser's claim can't be trusted). */
async function sniff(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const at = (offset: number, ...bytes: number[]) => bytes.every((x, i) => b[offset + i] === x);
  const ascii = (offset: number, text: string) => at(offset, ...[...text].map((ch) => ch.charCodeAt(0)));
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (ascii(0, "GIF8")) return "image/gif";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "image/webp";
  if (ascii(4, "ftypavi")) return "image/avif";
  if (ascii(0, "%PDF-")) return "application/pdf";
  const head = new TextDecoder().decode(b).trimStart().toLowerCase();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg[\s>]/.test(head)) return "image/svg+xml";
  return null;
}

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
  if ((await sniff(file)) !== file.type) return c.json({ error: "That file isn't what its name says it is" }, 400);
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
