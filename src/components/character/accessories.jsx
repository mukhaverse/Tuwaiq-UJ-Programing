import { palette as c } from "../../lib/palette";

const INK = c.ink;
const S = { stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round", strokeLinecap: "round" };
// A shade lighter than the ink outline, so a black hat still shows its edges.
const CAP_BLACK = "#2b2838";

/* Each accessory is drawn once, centred on (0, 0) in the characters' 200×200
   space, and Character places it on a shape through that shape's anchors:
     head  (0, 0) is where it sits on the crown; it rises above it
     face  (0, 0) is midway between the eyes, which are 48 apart
     neck  (0, 0) is the middle of the neckline */

// A component in a file that exports a helper: fine here, it never hot-reloads on its own.
// oxlint-disable-next-line react/only-export-components
function Cap({ fill, mark }) {
  return (
    <>
      <path d="M-46 6L70 4Q80 10 68 16L-46 14Z" fill={fill} {...S} />
      <path d="M-44 8C-44 -28 -24 -44 0 -44C24 -44 44 -28 44 8Z" fill={fill} {...S} />
      <path d="M0 -44V6" fill="none" {...S} strokeWidth={3} opacity=".5" />
      {mark}
      <circle cx="0" cy="-44" r="5" fill={fill} {...S} strokeWidth={3.5} />
    </>
  );
}

const drawings = {
  cap: () => <Cap fill={c.tomato} />,
  // Three cyan pixels climbing the front, like the Push Your Limits poster.
  "push-cap": () => (
    <Cap
      fill="#4f29b7"
      mark={
        <g fill={c.aqua}>
          <rect x="-26" y="-12" width="10" height="10" />
          <rect x="-16" y="-22" width="10" height="10" />
          <rect x="-6" y="-32" width="10" height="10" />
        </g>
      }
    />
  ),
  // A mortarboard: the cap, the flat board on top, and a gold tassel off to the side.
  gradcap: () => (
    <>
      <path d="M-34 8L-30 -18H30L34 8Q0 16 -34 8Z" fill={CAP_BLACK} {...S} />
      <path d="M0 -44L62 -27L0 -10L-62 -27Z" fill={CAP_BLACK} {...S} />
      <path d="M0 -27L44 -20V4" fill="none" stroke={c.butter} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="38" y="2" width="12" height="16" rx="4" fill={c.butter} {...S} strokeWidth={3.5} />
      <circle cx="0" cy="-27" r="5" fill={c.butter} {...S} strokeWidth={3} />
    </>
  ),
  bow: () => (
    <g transform="translate(24 -2) rotate(-12)">
      <path d="M0 0L-28 -18Q-36 0 -28 18Z" fill={c.bubblegum} {...S} />
      <path d="M0 0L28 -18Q36 0 28 18Z" fill={c.bubblegum} {...S} />
      <circle cx="0" cy="0" r="8" fill={c.bubblegum} {...S} />
    </g>
  ),
  headphones: () => (
    <>
      <path d="M-56 22A56 56 0 0 1 56 22" fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d="M-56 22A56 56 0 0 1 56 22" fill="none" stroke={c.grape} strokeWidth="5" strokeLinecap="round" />
      <rect x="-70" y="10" width="22" height="38" rx="9" fill={c.grape} {...S} />
      <rect x="48" y="10" width="22" height="38" rx="9" fill={c.grape} {...S} />
    </>
  ),
  glasses: ({ frame, single }) =>
    single ? (
      <>
        <path d="M24 -4L44 -10" fill="none" {...S} stroke={frame} />
        <circle cx="0" cy="0" r="24" fill="#fff" fillOpacity=".18" {...S} stroke={frame} />
      </>
    ) : (
    <>
      <path d="M-44 -4L-62 -10M44 -4L62 -10M-6 -2Q0 -8 6 -2" fill="none" {...S} stroke={frame} />
      <circle cx="-24" cy="0" r="20" fill="#fff" fillOpacity=".18" {...S} stroke={frame} />
      <circle cx="24" cy="0" r="20" fill="#fff" fillOpacity=".18" {...S} stroke={frame} />
    </>
    ),
  // Lenses a little bigger than the eyes they cover; a single wide visor on a one-eyed face.
  shades: ({ frame, single }) =>
    single ? (
      <>
        <path d="M-30 -8L-46 -12M30 -8L46 -12" fill="none" {...S} stroke={frame} />
        <rect x="-30" y="-21" width="60" height="42" rx="15" fill={INK} {...S} stroke={frame} />
        <path d="M-20 -10L-10 -10" stroke={c.cream} strokeWidth="3.5" strokeLinecap="round" opacity=".7" />
      </>
    ) : (
      <>
        <path d="M-50 -8L-64 -12M50 -8L64 -12M-6 -6H6" fill="none" {...S} stroke={frame} />
        <rect x="-50" y="-20" width="48" height="40" rx="14" fill={INK} {...S} stroke={frame} />
        <rect x="2" y="-20" width="48" height="40" rx="14" fill={INK} {...S} stroke={frame} />
        <path d="M-41 -10L-32 -10M11 -10L20 -10" stroke={c.cream} strokeWidth="3.5" strokeLinecap="round" opacity=".7" />
      </>
    ),
  scarf: () => (
    <>
      <path d="M16 6L32 6L38 44L20 44Z" fill={c.cherry} {...S} />
      <path d="M-48 -8Q0 10 48 -8L48 8Q0 28 -48 8Z" fill={c.cherry} {...S} />
      <path d="M-30 0V14M-12 4V18M6 4V18M24 2V16" stroke={c.cream} strokeWidth="3" opacity=".6" />
    </>
  ),
  bowtie: () => (
    <>
      <path d="M0 0L-24 -14L-24 14Z" fill={c.grape} {...S} />
      <path d="M0 0L24 -14L24 14Z" fill={c.grape} {...S} />
      <rect x="-7" y="-7" width="14" height="14" rx="4" fill={c.grape} {...S} />
    </>
  ),
};

/** The accessory's drawing, or null for an id nobody has drawn. `dark`: it sits on a dark
    face, so frames go light. `single`: the face has one eye, so glasses get one lens. */
export function drawAccessory(id, { dark = false, single = false } = {}) {
  return drawings[id]?.({ frame: dark ? c.cream : INK, single }) ?? null;
}
