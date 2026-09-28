/* The Commit Mountain: Tuwaiq mountain drawn as a commit graph, pixel by pixel.
   Each cell is [column, row, colour] on a 15 × 7 grid; row 0 holds the summit dot.
   Purple climbs the left slope, turquoise runs down the right, both fading out at the base.
   Listed in the order the splash builds them. */
export const CELLS = [
  [0, 6, "#2a2740"],
  [1, 6, "#2f2b48"],
  [2, 6, "#383452"],
  [3, 5, "#403c63"],
  [4, 5, "#4f29b7"],
  [5, 4, "#5a32cc"],
  [6, 3, "#7550e0"],
  [7, 3, "#7d58e8"],
  [7, 2, "#7d58e8"],
  [8, 2, "#8a66f2"],
  [8, 1, "#a380ff"],
  [9, 2, "#62d3c9"],
  [9, 3, "#57e3d8"],
  [10, 3, "#57e3d8"],
  [10, 4, "#3fa39b"],
  [11, 4, "#3fa39b"],
  [11, 5, "#2f7a74"],
  [12, 5, "#2f7a74"],
  [12, 6, "#22443f"],
  [13, 6, "#22443f"],
  [14, 6, "#22443f"],
];

/** Seconds the assembly takes for a given per-pixel step (without the start delay). */
export const assemblyTime = (step) => CELLS.length * step + 0.2;
