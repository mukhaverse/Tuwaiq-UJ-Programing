// Small pieces shared by the admin routes.
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { ValidationTargets } from "hono";

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

/** True when a D1 error is a duplicate primary key. */
export const isDuplicate = (err: unknown) => String((err as Error)?.message ?? err).includes("UNIQUE constraint failed");
