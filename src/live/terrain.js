// The ridge's shape and where everything sits on it. Pure maths, no DOM.
// Read left to right: a low plain, the Tuwaiq escarpment, then a long plateau
// that grows to the right, one ledge per answer.

/** Ground height, in pixel blocks, of column `c`. */
export function terrain(c) {
  if (c < 7) return 4 + ((c * 7) % 3 === 0 ? 1 : 0);
  if (c < 12) return 4 + Math.round((c - 6) * 2.4);
  return 15 + Math.round(Math.sin(c * 0.33) * 1.6 + Math.sin(c * 0.9) * 0.8);
}

export const TONES = ["#2B1C4E", "#3B2A6B", "#4A2C6E", "#5B3480"];
export const EDGE = "#6B4596";

/**
 * Sizes for a stage `vw` wide and `H` tall. Signs sit on two fixed rows (`rows`):
 * even answers on the top row, odd ones on the lower row, so neighbours never overlap.
 */
export function geometry(vw, H, present = false) {
  const small = vw < 700;
  if (small) return { small, vw, H, px: 12, start: 110, gap: 100, tail: 180, from: 200, signW: 136, climber: 30, rows: [10, 106] };
  if (present) {
    // A tall projector: bring both rows down to just above the highest ledge (H - 306),
    // leaving room for the tallest sign (~130px) and a short pole.
    const lower = Math.max(156, H - 470);
    return { small, vw, H, px: 18, start: 200, gap: 124, tail: 320, from: 300, signW: 200, climber: 48, rows: [lower - 140, lower] };
  }
  return { small, vw, H, px: 18, start: 200, gap: 124, tail: 320, from: 300, signW: 176, climber: 44, rows: [16, 146] };
}

/** How wide the ridge is with `n` answers: at least the stage, plus room after the last ledge. */
export function trackWidth(g, n) {
  return Math.max(g.vw, g.start + Math.max(0, n - 1) * g.gap + g.tail);
}

/** Ground y (top of the terrain) at pixel x. */
export function groundY(g, x) {
  return g.H - terrain(Math.floor(x / g.px)) * g.px;
}

/** Ledge `i`: snapped to the middle of its pixel column, standing on the ground there. */
export function ledgeAt(g, i) {
  const c = Math.floor((g.start + i * g.gap) / g.px);
  return { x: c * g.px + g.px / 2, y: g.H - terrain(c) * g.px, row: i % 2 };
}

/** Where to scroll so the newest ledge sits at ~62% of the stage. */
export function latestScroll(g, n) {
  if (!n) return 0;
  const led = ledgeAt(g, n - 1);
  return Math.max(0, Math.min(trackWidth(g, n) - g.vw, led.x - g.vw * 0.62));
}

/**
 * Draws the sky, stars and terrain for x in [x0, x0 + w) onto a canvas that size.
 * The ridge is drawn in tiles, since one canvas can't be as wide as a long board.
 */
export function drawTile(ctx, g, x0, w) {
  const sky = ctx.createLinearGradient(0, 0, 0, g.H);
  sky.addColorStop(0, "#0E0A22");
  sky.addColorStop(0.7, "#1B1238");
  sky.addColorStop(1, "#2A1A4A");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, g.H);

  // One star per 22px slot, at a spot fixed by its slot, so stars stay put as the ridge grows.
  ctx.fillStyle = "rgba(255,255,255,.5)";
  const skyH = Math.round(g.H * 0.45);
  for (let i = Math.floor(x0 / 22); i * 22 < x0 + w; i++) {
    if ((i * 7) % 3 === 1) continue;
    const sx = i * 22 + ((i * 97) % 22);
    const sy = (i * 53) % skyH;
    ctx.fillRect(sx - x0, sy, 4, 4);
  }

  for (let c = Math.floor(x0 / g.px); c * g.px < x0 + w; c++) {
    const h = terrain(c);
    for (let k = 0; k < h; k++) {
      ctx.fillStyle = k > h - 3 ? EDGE : TONES[(c * 3 + k) % 4];
      ctx.fillRect(c * g.px - x0, g.H - (k + 1) * g.px, g.px - 0.5, g.px - 0.5);
    }
  }
}
