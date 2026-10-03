// Shared colours for characters, badges and tiles. Mirrors the CSS tokens in styles/tokens.css.
export const palette = {
  ink: "#16181d",
  cream: "#f4f3ef",
  plum: "#5b5bd6",
  blush: "#f2b8c6",
  tomato: "#e5484d",
  butter: "#f2c14e",
  mint: "#7dcfa3",
  sky: "#8bb9ea",
};

// Colours dark enough to need light text/features on top.
const DARK = new Set(["ink", "plum", "tomato"]);

export function color(key) {
  return palette[key] ?? palette.butter;
}

export function textOn(key) {
  return DARK.has(key) ? palette.cream : palette.ink;
}

/** Ink or cream: whichever reads better on a "#rrggbb" background (a track's colour, say). */
export function inkOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lum = 0.2126 * r ** 2.2 + 0.7152 * g ** 2.2 + 0.0722 * b ** 2.2;
  return lum > 0.18 ? palette.ink : palette.cream;
}
