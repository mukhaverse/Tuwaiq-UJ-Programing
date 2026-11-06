// The club's President and Vice President. They aren't on the track roster, so
// they get no member card or profile: just a chess piece on the hero's mountain,
// the first on the far-left block and the second on the far-right one.
//
//   name   always shown above the piece, as "@name"
//   title  their club role, shown on hover
//   piece  "knight" | "rook" (see components/intro/Leaders.jsx)
//   knockedOff  true on the second: they land with everyone, then the first's piece
//               leaps over and knocks them off the mountain. Delete it to keep them.
export const leaders = [
  { name: "Jana", title: "President", piece: "knight" },
  { name: "Albaraa", title: "Vice President", piece: "rook", knockedOff: true },
];
