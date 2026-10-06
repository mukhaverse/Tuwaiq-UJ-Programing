// The track roster. It lives in the database and is edited from the admin
// panel; the site loads it once at startup (see content.js). Each member:
//
//   id       unique, URL-safe slug (used in links like #member/shumokh)
//   name     full name, exactly as the member wrote it — shown on their profile
//   short    (optional) card name, if "first + last word" gets it wrong
//   role     "leader" | "co-leader" | "member" (leaders get their own card hue)
//   major    what they study
//   year     academic year, 1–5 (the member filters are built from these)
//   bio      (optional) one or two sentences — profiles say "coming soon" until it's filled
//   quote    (optional) what their character says on the playground board
//   avatar   { char, body }: a shape from Character.jsx and a palette key from lib/palette.js
//   badges   ids of the badges they've earned
export let members = [];

export function setMembers(list) {
  members = list;
}

const ORDINAL = ["", "1st", "2nd", "3rd", "4th", "5th", "6th"];

export function yearLabel(year) {
  return `${ORDINAL[year] ?? year} year`;
}

export const roleLabel = { leader: "Leader", "co-leader": "Co-Leader", member: "Member" };

// First and last name, for cards and tags; profiles show the full name.
// A member's `short` overrides it where the last word alone is wrong
// (e.g. a family name in two words, like "ابو الغيث").
export function shortName(member) {
  if (member.short) return member.short;
  const words = member.name.split(" ");
  return words.length > 2 ? `${words[0]} ${words.at(-1)}` : member.name;
}

// Names are in Arabic or English, as each member wrote them. Tagging the Arabic
// ones lets CSS give them an Arabic font and drop letter-spacing (which breaks
// the joins between Arabic letters).
export function nameLang(name) {
  return /[\u0600-\u06FF]/.test(name) ? "ar" : undefined;
}

// After someone writes a bio on a profile, so cards show it without a reload.
export function setMemberBio(id, bio) {
  const m = getMember(id);
  if (m) m.bio = bio;
}

export function getMember(id) {
  return members.find((m) => m.id === id);
}
