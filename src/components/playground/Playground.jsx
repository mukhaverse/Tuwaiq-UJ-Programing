import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Character from "../character/Character";
import SplitHeading from "../ui/SplitHeading";
import { members } from "../../data/members";
import { color } from "../../lib/palette";
import { nameLang } from "../../data/members";
import "./Playground.css";

// Stable pseudo-random number in [0, 1) for member i, so the layout is the same on every visit.
function seeded(i, k) {
  const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Starting spot (x: % of the free width, y: % of the board height) and tilt for each sticker. Like the channel's
// sticker board, neighbours alternate between a high and a low row, spread evenly
// left to right; bigger rosters get more rows. Works for any roster size.
function place(i, n) {
  const levels = Math.max(2, Math.ceil(n / 5));
  const level = i % levels;
  return {
    x: (n > 1 ? i / (n - 1) : 0.5) * 94 + seeded(i, 1) * 6,
    y: 6 + level * (54 / (levels - 1)) + seeded(i, 2) * 6,
    r: Math.round(seeded(i, 3) * 8 - 4),
  };
}

const stickers = members.map((m, i) => ({ ...m, ...place(i, members.length) }));

export default function Playground() {
  const board = useRef(null);
  const zTop = useRef(stickers.length);
  const [z, setZ] = useState({});
  const [talking, setTalking] = useState(null);

  const lift = (id) => setZ((prev) => ({ ...prev, [id]: ++zTop.current }));

  return (
    <section className="gang section-pad" id="playground">
      <div className="gang__head">
        <SplitHeading className="display">The playground</SplitHeading>
        <p className="mono">// go on, drag everyone around. they don't mind. mostly.</p>
      </div>

      <div className="board" ref={board}>
        {stickers.map((g, i) => (
          <motion.div
            key={g.id}
            className="gang__sticker"
            style={{ left: `calc((100% - var(--sw)) * ${g.x / 100})`, top: `${g.y}%`, zIndex: z[g.id] ?? i + 1 }}
            drag
            dragConstraints={board}
            dragElastic={0.18}
            dragTransition={{ power: 0.25, timeConstant: 220 }}
            initial={{ scale: 0, rotate: g.r }}
            whileInView={{ scale: 1, rotate: g.r }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: i * 0.06 }}
            whileHover={{ scale: 1.05, rotate: 0 }}
            whileDrag={{ scale: 1.14, rotate: 0, cursor: "grabbing" }}
            onPointerDown={() => lift(g.id)}
            onHoverStart={() => setTalking(g.id)}
            onHoverEnd={() => setTalking((t) => (t === g.id ? null : t))}
          >
            <AnimatePresence>
              {talking === g.id && g.quote && (
                <motion.p
                  className="bubble"
                  initial={{ opacity: 0, y: 10, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                >
                  {g.quote}
                </motion.p>
              )}
            </AnimatePresence>
            <Character type={g.avatar.char} body={color(g.avatar.body)} blink={i * 0.9} className="sticker" />
            <span className="gang__name mono" lang={nameLang(g.name)}>
              @{g.name.split(" ")[0].toLowerCase()}
            </span>
          </motion.div>
        ))}
        <p className="board__hint mono" aria-hidden="true">
          // canvas · drag to rearrange
        </p>
      </div>
    </section>
  );
}
