import { motion } from "motion/react";
import { CELLS } from "../../lib/mountain";
import "./Brand.css";

const CELL = 10;
const SIZE = 8;

/* The Commit Mountain (cells in lib/mountain.js). `assemble` builds the mountain commit by commit, starting after `delay` seconds. */
export default function Mountain({ assemble = false, delay = 0, step = 0.04, className = "" }) {
  const pop = (i) => ({
    initial: { opacity: 0, scale: 0 },
    animate: { opacity: 1, scale: 1 },
    transition: { type: "spring", stiffness: 600, damping: 24, delay: delay + i * step },
    style: { transformBox: "fill-box", transformOrigin: "center" },
  });

  return (
    <svg viewBox="0 0 150 70" className={`mountain ${className}`} aria-hidden="true">
      {CELLS.map(([c, r, fill], i) => {
        const props = { x: c * CELL + 1, y: r * CELL + 1, width: SIZE, height: SIZE, rx: 1, fill };
        return assemble ? <motion.rect key={i} {...props} {...pop(i)} /> : <rect key={i} {...props} />;
      })}
      {assemble ? (
        <motion.circle className="mountain__dot" cx={85} cy={6} r={3.6} {...pop(CELLS.length + 2)} />
      ) : (
        <circle className="mountain__dot" cx={85} cy={6} r={3.6} />
      )}
    </svg>
  );
}

/* The club lockup from the identity: TUWAIQ × UJ over a ruled PROGRAMMING. */
export function Lockup({ className = "" }) {
  return (
    <span className={`lockup ${className}`}>
      <span className="lockup__top">
        TUWAIQ <span className="lockup__x">×</span> UJ
      </span>
      <span className="lockup__sub">PROGRAMMING</span>
    </span>
  );
}
