import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
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
const TIP_WIDTH = 220;

/* A member's badges, stamped in one at a time on open. Every slot starts as a
   traced outline; each earned badge lands in its trace, then a fresh trace
   appears beside it: there's always room for one more. Hovering, focusing or
   tapping an earned badge pops up a note on why it was earned. The note floats
   over the shelf, so opening it never shifts the layout. */
export default function BadgeShelf({ earned, delay = 0.35 }) {
  const slots = [...earned, null];
  const shelf = useRef(null);
  const [tip, setTip] = useState(null); // { id, left, width, arrow }

  // Fit the note inside the shelf: centred on its badge where there's room,
  // pushed back in from the edges where there isn't.
  const show = (id, slot) => {
    if (tip?.id === id) return;
    const box = shelf.current.getBoundingClientRect();
    const at = slot.getBoundingClientRect();
    const width = Math.min(TIP_WIDTH, box.width);
    const center = at.left + at.width / 2 - box.left;
    const left = Math.min(Math.max(center - width / 2, 0), box.width - width);
    setTip({ id, width, left: left - (at.left - box.left), arrow: center - left });
  };
  const hide = () => setTip(null);

  // Touch has no "leave": a tap anywhere outside the shelf closes the note.
  useEffect(() => {
    if (!tip) return;
    const onDown = (e) => !shelf.current?.contains(e.target) && hide();
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [tip]);

  return (
    <ul className="shelf" ref={shelf}>
      {slots.map((badge, i) => {
        const at = delay + i * STEP;
        const open = badge && tip?.id === badge.id;
        const showHere = (e) => show(badge.id, e.currentTarget.parentNode);
        const Art = badge ? "button" : "span";
        const artProps = badge
          ? {
              type: "button",
              "aria-label": badge.name,
              "aria-expanded": open,
              "aria-describedby": open ? `why-${badge.id}` : undefined,
              onPointerEnter: (e) => e.pointerType === "mouse" && showHere(e),
              onPointerLeave: (e) => e.pointerType === "mouse" && hide(),
              onFocus: showHere,
              onBlur: hide,
              onClick: showHere,
            }
          : {};
        return (
          <li
            key={badge?.id ?? "next"}
            className={`shelf__slot ${badge ? "" : "shelf__slot--open"} ${open ? "is-active" : ""}`}
            title={badge ? undefined : "Still to be earned"}
          >
            <Art className="shelf__art" {...artProps}>
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
            </Art>
            <motion.span
              className="shelf__name mono"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: at + (badge ? 0.4 : 0.15) }}
            >
              {badge ? badge.name : "Next badge"}
            </motion.span>
            <AnimatePresence>
              {open && (
                <motion.span
                  id={`why-${badge.id}`}
                  role="tooltip"
                  className="shelf__why"
                  style={{ left: tip.left, width: tip.width, transformOrigin: `${tip.arrow}px 100%` }}
                  initial={{ opacity: 0, y: 8, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.92, transition: { duration: 0.12 } }}
                  transition={{ type: "spring", stiffness: 520, damping: 26 }}
                >
                  <span className="shelf__why-head mono">
                    <BadgeMark badge={badge} size="1.1rem" />
                    Earned for
                  </span>
                  <motion.span
                    className="shelf__why-text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.08 }}
                  >
                    {badge.description || badge.name}
                  </motion.span>
                  <span className="shelf__why-arrow" style={{ left: tip.arrow }} aria-hidden="true" />
                </motion.span>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
