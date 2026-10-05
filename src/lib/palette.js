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
  // The members survey's "Favorite Color" options, exactly as offered there.
  grape: "#7b4dff",
  bubblegum: "#f472b6",
  cobalt: "#3d7bff",
  aqua: "#57e3d8",
  leaf: "#4ade80",
  lemon: "#facc15",
  cherry: "#f0524f",
  snow: "#f5f5f5",
};

// The original character colours, before the survey shades were added.
export const ORIGINAL_COLOURS = ["cream", "plum", "blush", "tomato", "butter", "mint", "sky"];

// Each survey "Favorite Color" option → its exact shade, and the closest original colour.
// Black has neither: ink would hide a character's outline and face.
const SURVEY_COLOURS = {
  Purple: { exact: "grape", nearest: "plum" },
  Pink: { exact: "bubblegum", nearest: "blush" },
  Blue: { exact: "cobalt", nearest: "sky" },
  Cyan: { exact: "aqua", nearest: "mint" },
  Green: { exact: "leaf", nearest: "mint" },
  Yellow: { exact: "lemon", nearest: "butter" },
  Red: { exact: "cherry", nearest: "tomato" },
  White: { exact: "snow", nearest: "cream" },
};

/** The palette keys for a survey colour answer: { exact, nearest }, or null when there's no match. */
export function surveyColour(name) {
  return SURVEY_COLOURS[name] ?? null;
}

// Colours dark enough to need light text/features on top.
const DARK = new Set(["ink", "plum", "tomato", "grape"]);

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
