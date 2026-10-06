import { motion } from "motion/react";
import { Eye } from "../character/Character";
import { palette as c } from "../../lib/palette";
import { leaders } from "../../data/leaders";

const INK = c.ink;
const S = { stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round", strokeLinecap: "round" };
const line = { fill: "none", strokeLinecap: "round" };
// Dark brown marble (Emperador): a polished stone, warm but not wood.
const MARBLE = "#5a4038";

/* A marble chess set: the King in white, the Rook in dark brown. Same 200 × 200 grid
   and outline as the members' characters, but they aren't in CHARACTERS, so the
   admin can't hand one to a member. */
const pieces = {
  king: {
    draw: () => (
      <>
        <path d="M100 34V6M88 18H112" {...line} stroke={INK} strokeWidth="12" />
        <path d="M100 34V6M88 18H112" {...line} stroke={c.lemon} strokeWidth="5" />
        <path d="M74 60Q74 30 100 30Q126 30 126 60Z" fill={c.cream} {...S} />
        <rect x="58" y="56" width="84" height="18" rx="9" fill={c.cream} {...S} />
        <path d="M66 160L78 74H122L134 160Z" fill={c.cream} {...S} />
        <rect x="42" y="158" width="116" height="26" rx="10" fill={c.cream} {...S} />
        {/* Marble veins */}
        <path d="M72 150Q84 128 80 110M116 80Q120 92 130 96M60 176Q76 166 92 172" {...line} stroke={INK} strokeOpacity=".2" strokeWidth="2" />
        <Eye cx={86} cy={104} r={12} />
        <Eye cx={114} cy={104} r={12} delay={0.4} />
        <path d="M90 132Q100 142 110 132" fill="none" {...S} />
      </>
    ),
  },
  rook: {
    draw: () => (
      <>
        <path d="M54 76V34H74V50H90V34H110V50H126V34H146V76Z" fill={MARBLE} {...S} />
        <path d="M62 160L70 76H130L138 160Z" fill={MARBLE} {...S} />
        <rect x="42" y="158" width="116" height="26" rx="10" fill={MARBLE} {...S} />
        <path d="M74 150Q86 128 82 112M118 84Q122 96 128 98M60 176Q78 166 96 172" {...line} stroke={c.cream} strokeOpacity=".22" strokeWidth="2" />
        <Eye cx={86} cy={108} r={12} delay={1.1} />
        <Eye cx={114} cy={108} r={12} delay={1.5} />
        <path d="M90 136Q100 146 110 136" fill="none" {...S} stroke={c.cream} />
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
        <svg viewBox="0 0 200 200" className="char sticker" aria-hidden="true">
          {piece.draw()}
        </svg>
      </motion.button>
    );
  });
}
