// Every badge a member can earn, loaded from the database at startup (see content.js).
//
//   id          unique key, referenced from members' `badges`
//   name        label shown on cards and profiles
//   description one line explaining how it's earned
//   glyph       1–3 characters printed in the middle of the badge
//   milestone   (optional) the journey milestone this badge belongs to
// Every badge is drawn in the Tuwaiq orange.
export let badges = [];
let byId = {};

export function setBadges(list) {
  badges = list;
  byId = Object.fromEntries(list.map((b) => [b.id, b]));
}

export function getBadge(id) {
  return byId[id];
}
