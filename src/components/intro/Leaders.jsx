import { motion } from "motion/react";
import { Eye } from "../character/Character";
import { palette as c } from "../../lib/palette";
import { leaders } from "../../data/leaders";

const INK = c.ink;
const S = { stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round", strokeLinecap: "round" };
const line = { fill: "none", strokeLinecap: "round" };
// Dark brown marble (Emperador): a polished stone, warm but not wood.
const MARBLE = "#5a4038";

/* A marble chess set: the Knight in white, the Rook in dark brown. Same 200 × 200 grid
   and outline as the members' characters, but they aren't in CHARACTERS, so the
   admin can't hand one to a member. */
const pieces = {
  knight: {
    draw: () => (
      <>
        {/* Horse head in profile, facing left */}
        <path
          d="M64 160Q66 132 84 116Q68 112 52 106Q38 100 40 86Q42 72 58 64L84 44L90 22L106 40Q140 50 146 100Q148 132 136 160Z"
          fill={c.cream}
          {...S}
        />
        <rect x="42" y="158" width="116" height="26" rx="10" fill={c.cream} {...S} />
        {/* Mane */}
        <path d="M112 46Q128 54 132 68M128 76Q138 86 138 98M134 108Q142 120 140 134" {...line} stroke={c.lemon} strokeWidth="5" />
        {/* Marble veins */}
        <path d="M76 150Q88 132 98 126M60 176Q76 166 92 172" {...line} stroke={INK} strokeOpacity=".2" strokeWidth="2" />
        <circle cx="48" cy="84" r="3" fill={INK} />
        <Eye cx={80} cy={78} r={11} />
        <Eye cx={106} cy={78} r={11} delay={0.4} />
        <path d="M84 100Q94 108 104 100" fill="none" {...S} />
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
