// Every badge a member can earn. Members reference badges by `id`.
//
//   id          unique key, used in members.js
//   name        label shown on cards and profiles
//   description one line explaining how it's earned
//   glyph       1–3 characters printed in the middle of the badge
//   color       fill, one of the palette keys in lib/palette.js
//   milestone   (optional) the journey milestone this badge belongs to
export const badges = [
  {
    id: "first-meeting",
    name: "First Meeting",
    description: "Showed up to the very first Programming Track meeting.",
    glyph: "01",
    color: "plum",
    milestone: "first-meeting",
  },
];

const byId = Object.fromEntries(badges.map((b) => [b.id, b]));

export function getBadge(id) {
  return byId[id];
}
