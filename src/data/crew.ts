// The other committees' people, who show up on the playgrounds of the events they
// worked at, and the characters they can be (drawn in components/character/crew.jsx).
// The site, the admin form and the Worker all import this file, so they can't disagree.
// Plain TypeScript with no imports, so Node can run its tests directly.

export const COMMITTEES = ["operations", "media"] as const;
export type Committee = (typeof COMMITTEES)[number];

// The full name for the admin form, the short one for a sticker's name tag.
export const COMMITTEE_NAMES: Record<Committee, { name: string; tag: string }> = {
  operations: { name: "Operations", tag: "ops" },
  media: { name: "Media", tag: "media" },
};

// A committee can have several sets; the form shows each under its own heading.
export const CREW_SETS: { name: string; committee: Committee; characters: { id: string; name: string }[] }[] = [
  {
    name: "Event management",
    committee: "operations",
    characters: [
      { id: "calendar", name: "Calendar" },
      { id: "staff-pass", name: "Staff pass" },
      { id: "check-in", name: "Check-in tablet" },
      { id: "banner", name: "Roll-up banner" },
      { id: "tent", name: "Event tent" },
      { id: "dallah", name: "Dallah" },
      { id: "gift-bag", name: "Gift bag" },
      { id: "chair", name: "Folding chair" },
    ],
  },
  {
    name: "Industrial engineering",
    committee: "operations",
    characters: [
      { id: "hard-hat", name: "Hard hat" },
      { id: "gear", name: "Gear" },
      { id: "factory", name: "Factory" },
      { id: "conveyor", name: "Conveyor box" },
      { id: "forklift", name: "Forklift" },
      { id: "gantt", name: "Gantt chart" },
      { id: "stopwatch", name: "Stopwatch" },
      { id: "cone", name: "Safety cone" },
    ],
  },
  {
    name: "Photography",
    committee: "media",
    characters: [
      { id: "camera", name: "Camera" },
      { id: "film-roll", name: "Film roll" },
      { id: "softbox", name: "Softbox" },
      { id: "lens", name: "Lens" },
    ],
  },
  {
    name: "Videography",
    committee: "media",
    characters: [
      { id: "clapperboard", name: "Clapperboard" },
      { id: "cine-camera", name: "Cine camera" },
      { id: "drone", name: "Drone" },
      { id: "viewfinder", name: "Viewfinder" },
    ],
  },
  {
    name: "Editing",
    committee: "media",
    characters: [
      { id: "play", name: "Play button" },
      { id: "timeline", name: "Timeline" },
      { id: "colour-wheel", name: "Colour wheel" },
      { id: "scissors", name: "Scissors" },
    ],
  },
  {
    name: "Socials",
    committee: "media",
    characters: [
      { id: "like", name: "Like" },
      { id: "hashtag", name: "Hashtag" },
      { id: "bell", name: "Notification" },
      { id: "comment", name: "Comment" },
    ],
  },
];

/** The sets this committee picks from. */
export function setsFor(committee: Committee) {
  return CREW_SETS.filter((s) => s.committee === committee);
}

/** Whether someone from this committee may be this character. */
export function canBeCharacter(committee: Committee, character: string): boolean {
  return setsFor(committee).some((s) => s.characters.some((c) => c.id === character));
}
