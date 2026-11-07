// The club's President and Vice President. They aren't on the track roster, so
// they get no member card or profile: just a chess piece on the hero's mountain,
// the first on the far-left block and the second on the far-right one.
//
//   name   always shown above the piece, as "@name"
//   title  their club role, shown on hover
//   piece  "knight" | "rook" (see components/intro/Leaders.jsx)
//   hidden      true keeps them off the mountain; their spot stays empty
//   knockedOff  true on the second: they land with everyone, then the first's piece
//               leaps over and knocks them off the mountain (not used for now; to use
//               it, swap Albaraa's `hidden: true` for `knockedOff: true`)
export const leaders = [
  { name: "Jana", title: "President", piece: "knight" },
  { name: "Albaraa", title: "Vice President", piece: "rook", hidden: true },
];
