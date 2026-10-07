import { motion } from "motion/react";
import { Eye } from "../character/Character";
import { palette as c } from "../../lib/palette";
import { leaders } from "../../data/leaders";

const INK = c.ink;
const S = { stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round", strokeLinecap: "round" };
const line = { fill: "none", strokeLinecap: "round" };
// Dark brown marble (Emperador): a polished stone, warm but not wood.
const MARBLE = "#5a4038";

/* A marble chess set: the Knight in white, the Rook in dark brown. Same outline
   as the members' characters, but on a taller 200 × 240 grid so the pieces stand
   tall and slim. They aren't in CHARACTERS, so the admin can't hand one to a
   member. Each base ends 19 units above the bottom (8%), which Hero.css nudges
   down so it stands on its block. */
const pieces = {
  knight: {
    draw: () => (
      <>
        {/* Horse head in profile, facing left, on a long neck */}
        <path
          d="M62 198Q56 150 80 104Q64 98 48 108Q32 106 34 90L70 46Q80 30 96 28L104 8L118 30Q152 46 152 96Q154 150 140 198Z"
          fill={c.cream}
          {...S}
        />
        {/* Mane */}
        <path d="M120 32Q152 54 150 118" {...line} stroke={INK} strokeWidth="9" />
        <path d="M120 32Q152 54 150 118" {...line} stroke="#4a4166" strokeWidth="4" />
        {/* Marble veins */}
        <path d="M84 186Q92 162 102 150M110 70Q120 80 128 78" {...line} stroke={INK} strokeOpacity=".2" strokeWidth="2" />
        <circle cx="46" cy="94" r="3.5" fill={INK} />
        <path d="M40 104Q52 110 62 104" fill="none" {...S} strokeWidth="3.5" />
        <Eye cx={90} cy={62} r={13} />
        <rect x="42" y="195" width="116" height="26" rx="10" fill={c.cream} {...S} />
        <path d="M60 213Q76 203 92 209" {...line} stroke={INK} strokeOpacity=".2" strokeWidth="2" />
      </>
    ),
  },
  rook: {
    draw: () => (
      <>
        <path d="M54 66V22H74V38H90V22H110V38H126V22H146V66Z" fill={MARBLE} {...S} />
        <path d="M62 196L70 66H130L138 196Z" fill={MARBLE} {...S} />
        <rect x="42" y="195" width="116" height="26" rx="10" fill={MARBLE} {...S} />
        {/* Marble veins */}
        <path d="M74 184Q86 158 82 136M118 76Q122 88 128 90M60 213Q78 203 96 209" {...line} stroke={c.cream} strokeOpacity=".22" strokeWidth="2" />
        <Eye cx={86} cy={112} r={12} delay={1.1} />
        <Eye cx={114} cy={112} r={12} delay={1.5} />
        <path d="M90 142Q100 152 110 142" fill="none" {...S} stroke={c.cream} />
      </>
    ),
  },
};

/* The President and Vice President on the mountain's end blocks (`spots`, as
   left/bottom styles), each under an "@name" tag that rolls to their role on
   hover or tap. They land after the climbers (`delay`). */
export default function Leaders({ spots, delay = 0 }) {
  return leaders.map((l, i) => {
    const piece = pieces[l.piece];
    return (
      <motion.button
        key={l.name}
        type="button"
        className={`climb__leader climb__leader--${i === 0 ? "first" : "second"}`}
        style={spots[i]}
        aria-label={`${l.title}: ${l.name}`}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 16, delay: delay + i * 0.1 }}
        whileHover={{ y: -8 }}
      >
        <span className="climb__tag mono" aria-hidden="true">
          <span>@{l.name}</span>
          <span>{l.title}</span>
        </span>
        <svg viewBox="0 0 200 240" className="char sticker" aria-hidden="true">
          {piece.draw()}
        </svg>
      </motion.button>
    );
  });
}
