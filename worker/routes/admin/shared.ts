// Small pieces shared by the API routes (admin and public).
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { ValidationTargets } from "hono";
import { getDb } from "../../db/client";
import { settings, tracks } from "../../db/schema";

/** URL-safe ids like "first-meeting": lowercase letters, digits and single dashes. */
export const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes, like first-meeting");

/** Optional text: trimmed, and stored as null when left empty. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

export const requiredText = (max: number) => z.string().trim().min(1, "Required").max(max);

/** A project's kind, like "survey" or "website", or "" for none. The choices live in src/data/projects.js. */
export const kind = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{0,30}$/, "Unknown kind")
  .default("");

/** A new order for a list: every id, first to last. */
export const orderInput = z.object({ ids: z.array(z.string()).min(1) });

/** Validates the request body and answers 400 with the first problem, in words. */
export const body = <T extends z.ZodType>(schema: T, target: keyof ValidationTargets = "json") =>
  zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue.path.join(".");
      return c.json({ error: field ? `${field}: ${issue.message}` : issue.message }, 400);
    }
  });

/** An error's message and those of its causes (Drizzle wraps D1's error in its own). */
export function errorText(err: unknown): string {
  const parts: string[] = [];
  for (let e = err; e && parts.length < 5; e = (e as Error).cause) parts.push(String((e as Error).message ?? e));
  return parts.join(" | ");
}

/** True when a D1 error is a duplicate primary key or unique value. */
export const isDuplicate = (err: unknown) => errorText(err).includes("UNIQUE constraint failed");

/** Whether visitors can send build requests. Closed until an admin opens it. */
export async function requestsOpen(env: Env) {
  const [row] = await getDb(env).select().from(settings).where(eq(settings.key, "requests"));
  return (row?.value as { open?: boolean } | undefined)?.open === true;
}

/** True when `id` is a track in the list. */
export async function trackExists(env: Env, id: string) {
  const [row] = await getDb(env).select({ id: tracks.id }).from(tracks).where(eq(tracks.id, id));
  return Boolean(row);
}
