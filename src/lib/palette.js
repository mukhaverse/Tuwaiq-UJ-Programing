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
