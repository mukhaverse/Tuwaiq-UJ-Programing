// Every badge a member can earn. Members reference badges by `id`.
//
//   id          unique key, used in members.js
//   name        label shown on cards and profiles
//   description one line explaining how it's earned
//   glyph       1–3 characters printed in the middle of the badge
//   milestone   (optional) the journey milestone this badge belongs to
// Every badge is drawn in the Tuwaiq orange.
export const badges = [
  {
    id: "first-meeting",
    name: "First Meeting",
    description: "Showed up to the very first Programming Track meeting.",
    glyph: "01",
    milestone: "first-meeting",
  },
];

const byId = Object.fromEntries(badges.map((b) => [b.id, b]));

export function getBadge(id) {
  return byId[id];
}
