// Admin: who from the other committees worked at each event. They show on its playground.
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, type AppEnv } from "../../db/client";
import { eventCrew, milestones } from "../../db/schema";
import { COMMITTEES, CREW_GLASSES, canBeCharacter } from "../../../src/data/crew";
import { COLOURS } from "../../../src/data/looks";
import { body, requiredText } from "./shared";

// Left empty: the character's own colour, and no glasses.
const optionalOf = (allowed: string[], message: string) =>
  z
    .string()
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || allowed.includes(v), message);

const fields = {
  name: requiredText(40),
  committee: z.enum(COMMITTEES),
  character: z.string().max(40),
  colour: optionalOf(COLOURS, "Unknown colour"),
  glasses: optionalOf(
    CREW_GLASSES.map((g) => g.id),
    "Unknown glasses"
  ),
};
const inTheirSets = (p: { committee: (typeof COMMITTEES)[number]; character: string }) => canBeCharacter(p.committee, p.character);
const notTheirs = { message: "That character isn't in this committee's sets", path: ["character"] };
const createInput = z.object({ milestoneId: z.string().max(100), ...fields }).refine(inTheirSets, notTheirs);
const updateInput = z.object(fields).refine(inTheirSets, notTheirs);

const route = new Hono<AppEnv>();

route.post("/", body(createInput), async (c) => {
  const person = c.req.valid("json");
  const db = getDb(c.env);
  const [event] = await db.select({ id: milestones.id }).from(milestones).where(eq(milestones.id, person.milestoneId));
  if (!event) return c.json({ error: "Milestone not found" }, 404);
  const [added] = await db.insert(eventCrew).values(person).returning({ id: eventCrew.id });
  return c.json({ ok: true, id: added.id }, 201);
});

// Their name, committee or look, changed after they were added.
route.put("/:id", body(updateInput), async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Person not found" }, 404);
  const [updated] = await getDb(c.env).update(eventCrew).set(c.req.valid("json")).where(eq(eventCrew.id, id)).returning({ id: eventCrew.id });
  if (!updated) return c.json({ error: "Person not found" }, 404);
  return c.json({ ok: true });
});

route.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "Person not found" }, 404);
  const [gone] = await getDb(c.env).delete(eventCrew).where(eq(eventCrew.id, id)).returning({ id: eventCrew.id });
  if (!gone) return c.json({ error: "Person not found" }, 404);
  return c.json({ ok: true });
});

export default route;
