// What a member's character may look like, and what they may change.
// The site (the Customize editor's locks) and the Worker (checking suggestions
// and approvals) both import this file, so the two can never disagree.
// Plain TypeScript with no imports, so Node can run its tests directly.

export type Role = "leader" | "co-leader" | "member";
export type Slot = "head" | "face" | "mustache" | "mouth" | "beside";
export type Look = { char: string; body: string; wear: string[] };
export type LookMember = { role: Role; badges: number; accessories: string[]; current: Look };

// Every character shape, in Character.jsx's order.
export const SHAPES = ["blob", "star", "ghost", "robot", "cat", "cloud", "sun", "planet", "mushroom", "flower", "monitor"];

// Shapes only one role may use.
const RESERVED: Record<string, Role> = { sun: "leader", planet: "co-leader" };

// Every palette colour but ink, which would hide the outline and face: the originals, then the survey shades.
export const COLOURS = [
  "cream", "plum", "blush", "tomato", "butter", "mint", "sky",
  "grape", "bubblegum", "cobalt", "aqua", "leaf", "lemon", "cherry", "snow",
];

// Starter accessories unlock at 2 badges; the rest are awarded by an admin.
export const ACCESSORIES: { id: string; name: string; slot: Slot; starter: boolean }[] = [
  { id: "gradcap", name: "Graduation cap", slot: "head", starter: true },
  { id: "headphones", name: "Headphones", slot: "head", starter: true },
  { id: "crown", name: "Crown", slot: "head", starter: true },
  { id: "flowercrown", name: "Flower crown", slot: "head", starter: true },
  { id: "sprout", name: "Sprout", slot: "head", starter: true },
  { id: "glasses", name: "Glasses", slot: "face", starter: true },
  { id: "shades", name: "Sunglasses", slot: "face", starter: true },
  { id: "mask", name: "Hero mask", slot: "face", starter: true },
  { id: "mustache", name: "Mustache", slot: "mustache", starter: true },
  // Mouths replace the shape's own mouth.
  { id: "smile", name: "Big smile", slot: "mouth", starter: true },
  { id: "grin", name: "Toothy grin", slot: "mouth", starter: true },
  { id: "tongue", name: "Tongue out", slot: "mouth", starter: true },
  { id: "pout", name: "Pout", slot: "mouth", starter: true },
  { id: "fang", name: "Fang", slot: "mouth", starter: true },
  { id: "fangs", name: "Two fangs", slot: "mouth", starter: true },
  { id: "bucktooth", name: "Buck teeth", slot: "mouth", starter: true },
  { id: "catmouth", name: "Cat smile", slot: "mouth", starter: true },
  { id: "smirk", name: "Smirk", slot: "mouth", starter: true },
  { id: "gasp", name: "Gasp", slot: "mouth", starter: true },
  { id: "wobbly", name: "Wobbly", slot: "mouth", starter: true },
  { id: "push-cap", name: "Push your limits cap", slot: "head", starter: false },
  // A baby version of their own character at their feet, for a member with a new sibling.
  { id: "baby", name: "Little sibling", slot: "beside", starter: false },
];

const byId = new Map(ACCESSORIES.map((a) => [a.id, a]));

/** How much a member with this many badges may change: nothing, the shape, or everything. */
export function allowedChanges(badges: number): "none" | "shape" | "all" {
  if (badges >= 2) return "all";
  return badges === 1 ? "shape" : "none";
}

/** The shapes this role may pick: everyone's, plus their own reserved one. */
export function shapesFor(role: Role): string[] {
  return SHAPES.filter((s) => !RESERVED[s] || RESERVED[s] === role);
}

/** Whether a member may put this accessory on: starters need 2 badges, extras need the award. */
export function canWear(m: { badges: number; accessories: string[] }, id: string): boolean {
  const a = byId.get(id);
  if (!a) return false;
  return a.starter ? m.badges >= 2 : m.accessories.includes(id);
}

/** Only what any look must satisfy: known accessories, one per spot. Admins are held to just this. */
export function checkWear(wear: string[]): string | null {
  const slots = new Set<Slot>();
  for (const id of wear) {
    const a = byId.get(id);
    if (!a) return "Unknown accessory.";
    if (slots.has(a.slot)) return "Only one accessory per spot.";
    slots.add(a.slot);
  }
  return null;
}

/** What's safe to draw from a stored list: known ids, extras still awarded, the first per spot. */
export function cleanWear(wear: unknown, awarded: string[]): string[] {
  if (!Array.isArray(wear)) return [];
  const slots = new Set<Slot>();
  const out: string[] = [];
  for (const id of wear) {
    const a = typeof id === "string" ? byId.get(id) : undefined;
    if (!a || slots.has(a.slot) || (!a.starter && !awarded.includes(a.id))) continue;
    slots.add(a.slot);
    out.push(a.id);
  }
  return out;
}

/** Same shape, colour and accessories (in any order). */
export function sameLook(a: Look, b: Look): boolean {
  return a.char === b.char && a.body === b.body && a.wear.length === b.wear.length && a.wear.every((id) => b.wear.includes(id));
}

/** Why this member can't have this look, or null when they can. */
export function checkLook(m: LookMember, look: Look): string | null {
  if (!SHAPES.includes(look.char)) return "Unknown shape.";
  const owner = RESERVED[look.char];
  if (owner && owner !== m.role) return `That shape is only for the ${owner}.`;
  if (!COLOURS.includes(look.body)) return "Unknown colour.";
  const wearError = checkWear(look.wear);
  if (wearError) return wearError;

  const tier = allowedChanges(m.badges);
  if (tier === "none") return "Earn a badge first to change this character.";
  const sameRest = sameLook({ ...look, char: m.current.char }, m.current);
  if (tier === "shape" && !sameRest) return "With one badge, only the shape can change.";
  // Accessories they already had on stay allowed; anything new must be theirs to wear.
  if (look.wear.some((id) => !m.current.wear.includes(id) && !canWear(m, id))) return "They don't have that accessory yet.";
  return null;
}
