import { palette as c } from "../../lib/palette";

const INK = c.ink;
const S = { stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round", strokeLinecap: "round" };
// A shade lighter than the ink outline, so a black hat still shows its edges.
const CAP_BLACK = "#2b2838";

/* Each accessory is drawn once, centred on (0, 0) in the characters' 200×200
   space, and Character places it on a shape through that shape's anchors:
     head  (0, 0) is where it sits on the crown; it rises above it
     face  (0, 0) is midway between the eyes, which are 48 apart
     mustache  (0, 0) is just above the mouth, where a mustache's top edge goes
     mouth     (0, 0) is the middle of the mouth; a worn mouth replaces the shape's own
   Headphones sit on a finer point of the head instead (ANCHOR_OF):
     ears  (0, 0) is midway between the sides of the head; w is the half-width
           to each side and h the rise to the top of the head */

// Items that sit on a finer point than their slot's.
// oxlint-disable-next-line react/only-export-components
export const ANCHOR_OF = { headphones: "ears" };

const GOLD = c.butter;
const TONGUE = c.bubblegum;
// The fang mouths: a smile line, and a fang hanging off it right of centre (mirrored for the second).
const SMILE_LINE = "M-18 -5Q0 11 18 -5";
const FANG = "M4 2.6L13 -1.2L10.5 9.5Z";

// n points spread along the curve p0 → p2 (bent toward p1), each as [x, y, heading in degrees].
function along([x0, y0], [x1, y1], [x2, y2], n) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * x1 + t * t * x2;
    const y = u * u * y0 + 2 * u * t * y1 + t * t * y2;
    const a = Math.atan2(2 * u * (y1 - y0) + 2 * t * (y2 - y1), 2 * u * (x1 - x0) + 2 * t * (x2 - x1));
    return [x, y, (a * 180) / Math.PI];
  });
}

// A five-petal flower, for the flower crown.
// oxlint-disable-next-line react/only-export-components
function Blossom({ x, y, fill, r = 10 }) {
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      {[0, 1, 2, 3, 4].map((k) => {
        const a = ((Math.PI * 2) / 5) * k - Math.PI / 2;
        return (
          <circle key={k} cx={(Math.cos(a) * r * 0.6).toFixed(1)} cy={(Math.sin(a) * r * 0.6).toFixed(1)} r={r * 0.55} fill={fill} {...S} strokeWidth={3} />
        );
      })}
      <circle r={r * 0.36} fill={c.lemon} {...S} strokeWidth={3} />
    </g>
  );
}

// An ear-side item's band: over the top of the head from one side to the other.
const band = (w, h, lift) => `M${-w} ${-lift}A${w} ${h - lift} 0 0 1 ${w} ${-lift}`;

// How far each head item reaches above its anchor, in its own units. Character shrinks
// one that would poke out of the top of the frame on a tall shape.
// oxlint-disable-next-line react/only-export-components
export const RISE = { "push-cap": 51, gradcap: 47, crown: 47, flowercrown: 22, sprout: 50 };

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
  crown: () => (
    <>
      <path d="M-38 6L-42 -32L-20 -14L0 -40L20 -14L42 -32L38 6Q0 14 -38 6Z" fill={GOLD} {...S} />
      <path d="M-39 -4Q0 4 39 -4" fill="none" {...S} strokeWidth={3} opacity=".45" />
      <circle cx="0" cy="-40" r="5" fill={c.tomato} {...S} strokeWidth={3} />
      <circle cx="-42" cy="-32" r="4.5" fill={c.aqua} {...S} strokeWidth={3} />
      <circle cx="42" cy="-32" r="4.5" fill={c.aqua} {...S} strokeWidth={3} />
      <circle cx="0" cy="-6" r="6" fill={c.tomato} {...S} strokeWidth={3} />
    </>
  ),
  flowercrown: () => (
    <>
      <path d="M-44 8Q0 -20 44 8" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M-44 8Q0 -20 44 8" fill="none" stroke={c.leaf} strokeWidth="4" strokeLinecap="round" />
      {along([-40, 6], [0, -20], [40, 6], 5).map(([x, y], i) => (
        <Blossom key={i} x={x} y={y} fill={[c.bubblegum, c.snow, c.sky][i % 3]} />
      ))}
    </>
  ),
  sprout: () => (
    <>
      <path d="M0 6Q-2 -12 2 -25" fill="none" {...S} />
      <path d="M2 -24C-6 -40 -28 -42 -32 -30C-20 -18 -4 -20 2 -24Z" fill={c.leaf} {...S} strokeWidth={4} />
      <path d="M2 -26C8 -44 30 -48 34 -36C24 -22 8 -22 2 -26Z" fill={c.leaf} {...S} strokeWidth={4} />
    </>
  ),
  // Cups on the sides of the head, the band stretched to the top of it.
  headphones: ({ w, h }) => (
    <>
      <path d={band(w, h, 14)} fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
      <path d={band(w, h, 14)} fill="none" stroke={c.grape} strokeWidth="5" strokeLinecap="round" />
      <rect x={-w - 11} y="-19" width="22" height="38" rx="9" fill={c.grape} {...S} />
      <rect x={w - 11} y="-19" width="22" height="38" rx="9" fill={c.grape} {...S} />
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
  // Eye holes over each eye; one hole on a one-eyed face.
  mask: ({ single }) =>
    single ? (
      <>
        <path d="M-40 -8L-52 -16M-40 -2L-52 4" fill="none" {...S} strokeWidth={4} />
        <path
          d="M-42 -2C-42 -26 42 -26 42 -2C42 22 -42 22 -42 -2ZM-22 0a22 22 0 1 0 44 0a22 22 0 1 0 -44 0Z"
          fill={c.cherry}
          fillRule="evenodd"
          {...S}
        />
      </>
    ) : (
      <>
        <path d="M-60 -8L-72 -16M-60 -2L-72 4" fill="none" {...S} strokeWidth={4} />
        <path
          d="M-62 -6C-60 -22 -30 -26 0 -14C30 -26 60 -22 62 -6C64 12 44 24 24 22C12 21 6 12 0 12C-6 12 -12 21 -24 22C-44 24 -64 12 -62 -6ZM-39 0a15 15 0 1 0 30 0a15 15 0 1 0 -30 0ZM9 0a15 15 0 1 0 30 0a15 15 0 1 0 -30 0Z"
          fill={c.cherry}
          fillRule="evenodd"
          {...S}
        />
      </>
    ),
  // Light on a dark face, like the glasses.
  mustache: ({ frame }) => (
    <path
      d="M0 0C-6 -5 -16 -5 -24 1C-29 5 -34 4 -36 -1C-36 9 -26 13 -14 10C-7 8 -2 5 0 3C2 5 7 8 14 10C26 13 36 9 36 -1C34 4 29 5 24 1C16 -5 6 -5 0 0Z"
      fill={frame}
      {...S}
      strokeWidth={3}
    />
  ),
  // Mouths, about as wide as the blob's own. Lines take the frame colour, so they show on a dark face.
  smile: ({ frame }) => (
    <>
      <path d="M-18 -5Q0 -1 18 -5Q14 15 0 15Q-14 15 -18 -5Z" fill={INK} {...S} stroke={frame} />
      <path d="M-8 12Q0 5 8 12Q4 14.5 0 14.5Q-4 14.5 -8 12Z" fill={TONGUE} />
    </>
  ),
  grin: ({ frame }) => (
    <>
      <path d="M-20 -6Q0 -2 20 -6Q16 14 0 14Q-16 14 -20 -6Z" fill="#fff" {...S} stroke={frame} />
      <path d="M-18 3Q0 6 18 3M-9 -3.5V12M0 -3V14M9 -3.5V12" fill="none" stroke={INK} strokeWidth="2.5" />
      <path d="M-20 -6Q0 -2 20 -6Q16 14 0 14Q-16 14 -20 -6Z" fill="none" {...S} stroke={frame} />
    </>
  ),
  tongue: ({ frame }) => (
    <>
      <path d="M-8 1Q-9 17 0 17Q9 17 8 1" fill={TONGUE} {...S} stroke={frame} strokeWidth={4} />
      <path d="M0 6V12" stroke={INK} strokeWidth="2.5" strokeLinecap="round" opacity=".35" />
      <path d="M-17 -4Q0 8 17 -4" fill="none" {...S} stroke={frame} />
    </>
  ),
  pout: ({ frame }) => (
    <>
      <path d="M-10 -1Q-5 -8 0 -4Q5 -8 10 -1Q7 8 0 8Q-7 8 -10 -1Z" fill={TONGUE} {...S} stroke={frame} strokeWidth={4} />
      <path d="M-8 0Q0 3 8 0" fill="none" {...S} stroke={frame} strokeWidth={3} />
    </>
  ),
  fang: ({ frame }) => (
    <>
      <path d={FANG} fill="#fff" {...S} stroke={frame} strokeWidth={3} />
      <path d={SMILE_LINE} fill="none" {...S} stroke={frame} />
    </>
  ),
  fangs: ({ frame }) => (
    <>
      <path d={FANG} fill="#fff" {...S} stroke={frame} strokeWidth={3} />
      <path d={FANG} transform="scale(-1 1)" fill="#fff" {...S} stroke={frame} strokeWidth={3} />
      <path d={SMILE_LINE} fill="none" {...S} stroke={frame} />
    </>
  ),
  bucktooth: ({ frame }) => (
    <>
      <rect x="-7" y="0" width="7" height="10" rx="2" fill="#fff" {...S} stroke={frame} strokeWidth={3} />
      <rect x="0" y="0" width="7" height="10" rx="2" fill="#fff" {...S} stroke={frame} strokeWidth={3} />
      <path d="M-15 -3Q0 7 15 -3" fill="none" {...S} stroke={frame} />
    </>
  ),
  catmouth: ({ frame }) => <path d="M-15 -3Q-13 8 -7 6Q-1 4 0 -2Q1 4 7 6Q13 8 15 -3" fill="none" {...S} stroke={frame} />,
  smirk: ({ frame }) => <path d="M-15 3Q3 7 15 -5M12 -9Q17 -7 17 -2" fill="none" {...S} stroke={frame} />,
  gasp: ({ frame }) => (
    <>
      <ellipse cx="0" cy="2" rx="9" ry="11" fill={INK} {...S} stroke={frame} />
      <ellipse cx="0" cy="8" rx="5" ry="3" fill={TONGUE} />
    </>
  ),
  wobbly: ({ frame }) => <path d="M-18 2L-12 -3L-6 2L0 -3L6 2L12 -3L18 2" fill="none" {...S} stroke={frame} />,

  // Parts of the little sibling (see Character), not worn on their own: a pacifier on the
  // mouth anchor and a curl of hair on the head anchor.
  pacifier: () => (
    <>
      <circle cx="0" cy="12" r="8" fill="none" stroke={INK} strokeWidth="4.5" />
      <ellipse cx="0" cy="0" rx="17" ry="9" fill={c.lemon} {...S} />
      <circle cx="0" cy="0" r="4" fill="#fff" {...S} strokeWidth={3} />
    </>
  ),
  curl: () => <path d="M-2 6C-6 -10 10 -20 16 -10C20 -3 12 3 7 -2" fill="none" {...S} strokeWidth={6} />,
};

/** The accessory's drawing, or null for an id nobody has drawn. `dark`: it sits on a dark
    face, so frames go light. `single`: the face has one eye, so glasses get one lens.
    `w`, `h`: an ear-side item's reach (see the top of this file). */
export function drawAccessory(id, { dark = false, single = false, w = 60, h = 60 } = {}) {
  return drawings[id]?.({ frame: dark ? c.cream : INK, single, w, h }) ?? null;
}
