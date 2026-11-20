// The club's President and Vice President. They aren't on the track roster, so
// they get no member card or profile: just a chess piece on the hero's mountain,
// the first on the far-left block and the second on the far-right one.
//
//   name   always shown above the piece, as "@name"
//   title  their club role, shown on hover
//   piece  "knight" | "rook" | "cone" (see components/intro/Leaders.jsx)
//   hidden      true keeps them off the mountain; their spot stays empty
//   was    (optional) the piece that stands in their spot first: it lands with
//          everyone, drops through a trap door, and then their own piece lands.
//          No name or tag, so it reads as a new look, not a new person.
//   knockedOff  true on the second: they land with everyone, then the first's piece
//               leaps over and knocks them off the mountain (not used for now)
export const leaders = [
  { name: "Jana", title: "President", piece: "knight" },
  { name: "Yehya", title: "Vice President", piece: "cone", was: "rook" },
];
