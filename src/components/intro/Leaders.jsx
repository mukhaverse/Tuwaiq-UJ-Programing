import { useRef } from "react";
import { motion } from "motion/react";
import { gsap, useGSAP, MOTION_OK } from "../../lib/gsap";
import { Eye } from "../character/Character";
import { palette as c } from "../../lib/palette";
import { leaders } from "../../data/leaders";

const INK = c.ink;
const S = { stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round", strokeLinecap: "round" };
const line = { fill: "none", strokeLinecap: "round" };
// Dark brown marble (Emperador): a polished stone, warm but not wood.
const MARBLE = "#5a4038";
// Dark blue marble (lapis), for the President's knight.
const LAPIS = "#22408f";

/* A marble chess set: the Knight in dark blue, the Rook in dark brown. Same outline
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
          fill={LAPIS}
          {...S}
        />
        {/* Mane */}
        <path d="M120 32Q152 54 150 118" {...line} stroke={INK} strokeWidth="9" />
        <path d="M120 32Q152 54 150 118" {...line} stroke={c.sky} strokeWidth="4" />
        {/* Marble veins */}
        <path d="M84 186Q92 162 102 150M110 70Q120 80 128 78" {...line} stroke={c.cream} strokeOpacity=".22" strokeWidth="2" />
        {/* Mini crown, tilted to sit on the forehead in front of the ear */}
        <g transform="translate(86 34) rotate(-34) scale(1.6)">
          <path d="M-14 0L-16 -16L-7 -8L0 -20L7 -8L16 -16L14 0Z" fill={c.butter} {...S} strokeWidth="2.8" />
          <circle cx="0" cy="-6" r="2.6" fill={c.tomato} />
        </g>
        <circle cx="46" cy="94" r="3.5" fill={c.cream} />
        <path d="M40 104Q52 110 62 104" fill="none" {...S} stroke={c.cream} strokeWidth="3.5" />
        <Eye cx={90} cy={62} r={13} />
        <rect x="42" y="195" width="116" height="26" rx="10" fill={LAPIS} {...S} />
        <path d="M60 213Q76 203 92 209" {...line} stroke={c.cream} strokeOpacity=".22" strokeWidth="2" />
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

/* The first piece leaps over the summit, bumps the second, which tips over and
   drops off the mountain's edge, then hops back home. Runs on the inner
   .climb__piece, so it doesn't fight motion's drop-in on the buttons. With
   reduced motion, the second is simply not there. Only runs when the second is
   marked knockedOff in src/data/leaders.js. */
function useKnockOff(buttons, start) {
  useGSAP(() => {
    const [hitter, target] = buttons.current;
    if (!leaders[1]?.knockedOff || !hitter || !target) return;
    const mover = hitter.querySelector(".climb__piece");
    const victim = target.querySelector(".climb__piece");
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const gap = () => target.offsetLeft - hitter.offsetLeft - hitter.offsetWidth * 0.7;
      const high = () => -hitter.offsetParent.offsetHeight * 0.85;
      const leap = (x) =>
        gsap
          .timeline()
          .to(mover, { scaleY: 0.8, duration: 0.08, transformOrigin: "50% 100%", ease: "power1.out" })
          .to(mover, { scaleY: 1, duration: 0.06 })
          .to(mover, { x, duration: 0.6, ease: "power2.inOut" }, "<")
          .to(mover, { keyframes: [{ y: high, ease: "power2.out" }, { y: 0, ease: "power3.in" }], duration: 0.6 }, "<");
      gsap
        .timeline({ delay: start })
        .set(hitter, { zIndex: 3 })
        .add(leap(gap))
        // A split-second wind-up, leaning back, then a swing that sends the rook off in one
        // unbroken arc: up high, easing over the top, then dropping faster and faster off
        // the bottom, spinning all the way.
        .to(mover, { x: () => gap() - 10, rotate: -14, duration: 0.15, ease: "power2.out" })
        .to(mover, { x: () => gap() + 24, rotate: 28, duration: 0.08, ease: "power2.in" })
        .to(victim, { scaleX: 0.75, scaleY: 1.1, duration: 0.05, transformOrigin: "0% 100%" }, ">-0.02")
        .to(mover, { x: gap, rotate: 0, duration: 0.2, ease: "power2.out" })
        .to(victim, { scaleX: 1, scaleY: 1, duration: 0.1 }, "<")
        .to(victim, { x: 260, rotate: 900, duration: 1, ease: "none", transformOrigin: "50% 60%" }, "<")
        .to(victim, { keyframes: [{ y: -190, duration: 0.34, ease: "power2.out" }, { y: 650, duration: 0.66, ease: "power2.in" }] }, "<")
        .to(victim, { autoAlpha: 0, duration: 0.15 }, ">-0.15")
        .add(leap(0), "<-0.6")
        .set(hitter, { zIndex: "" })
        // Gone for keyboards and screen readers too, not just out of sight.
        .set(target, { autoAlpha: 0 });
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(target, { autoAlpha: 0 });
    });
    return () => mm.revert();
  }, []);
}

/* The President and Vice President on the mountain's end blocks (`spots`, as
   left/bottom styles), each under an "@name" tag that rolls to their role on
   hover or tap. They land after the climbers (`delay`). */
export default function Leaders({ spots, delay = 0 }) {
  const buttons = useRef([]);
  useKnockOff(buttons, delay + 1);
  return leaders.map((l, i) => {
    if (l.hidden) return null;
    const piece = pieces[l.piece];
    return (
      <motion.button
        key={l.name}
        ref={(el) => (buttons.current[i] = el)}
        type="button"
        className={`climb__leader climb__leader--${i === 0 ? "first" : "second"}`}
        style={spots[i]}
        aria-label={`${l.title}: ${l.name}`}
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 16, delay: delay + i * 0.1 }}
        whileHover={{ y: -8 }}
      >
        <span className="climb__piece">
          <span className="climb__tag mono" aria-hidden="true">
            <span>@{l.name}</span>
            <span>{l.title}</span>
          </span>
          <svg viewBox="0 0 200 240" className="char sticker" aria-hidden="true">
            {piece.draw()}
          </svg>
        </span>
      </motion.button>
    );
  });
}
