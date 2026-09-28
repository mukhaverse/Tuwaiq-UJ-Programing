import { motion } from "motion/react";
import "./Badge.css";

// Hexagonal chip outline, with a dashed inner ring.
const HEX = "M50 4L90 27V73L50 96L10 73V27Z";
const HEX_INNER = "M50 17L79 34V66L50 83L21 66V34Z";

/* The badge graphic itself, always in the Tuwaiq orange. `size` is any CSS length. */
export function BadgeMark({ badge, size = "2.2rem" }) {
  return (
    <svg viewBox="0 0 100 100" className="badge-mark" style={{ width: size }} aria-hidden="true">
      <path d={HEX} fill="var(--orange)" stroke="var(--ink)" strokeWidth="5" strokeLinejoin="round" />
      <path d={HEX_INNER} fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="4 4" opacity=".45" />
      <text x="50" y="51" textAnchor="middle" dominantBaseline="central" fill="var(--ink)">
        {badge.glyph}
      </text>
    </svg>
  );
}

/* The empty outline of a badge still to be earned. */
function BadgeTrace() {
  return (
    <svg viewBox="0 0 100 100" className="badge-trace" aria-hidden="true">
      <path d={HEX} />
      <path d="M50 40V60M40 50H60" className="badge-trace__plus" />
    </svg>
  );
}

const STEP = 0.55;

/* A member's badges, stamped in one at a time on open. Every slot starts as a
   traced outline; each earned badge lands in its trace, then a fresh trace
   appears beside it: there's always room for one more. */
export default function BadgeShelf({ earned, delay = 0.35 }) {
  const slots = [...earned, null];
  return (
    <ul className="shelf">
      {slots.map((badge, i) => {
        const at = delay + i * STEP;
        return (
          <li
            key={badge?.id ?? "next"}
            className={`shelf__slot ${badge ? "" : "shelf__slot--open"}`}
            title={badge ? `${badge.name}: ${badge.description}` : "Still to be earned"}
          >
            <span className="shelf__art">
              <motion.span
                className="shelf__trace"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 24, delay: at }}
              >
                <BadgeTrace />
              </motion.span>
              {badge && (
                <motion.span
                  className="shelf__badge"
                  initial={{ opacity: 0, scale: 1.9, rotate: -25 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 15, delay: at + 0.25 }}
                >
                  <BadgeMark badge={badge} size="100%" />
                  <motion.span
                    className="shelf__ring"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 0.9, 0], scale: [0.8, 0.9, 1.7] }}
                    transition={{ duration: 0.7, delay: at + 0.3, times: [0, 0.1, 1] }}
                  />
                </motion.span>
              )}
            </span>
            <motion.span
              className="shelf__name mono"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: at + (badge ? 0.4 : 0.15) }}
            >
              {badge ? badge.name : "Next badge"}
            </motion.span>
          </li>
        );
      })}
    </ul>
  );
}
