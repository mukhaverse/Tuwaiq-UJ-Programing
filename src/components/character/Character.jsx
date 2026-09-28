import { useEffect, useRef } from "react";
import { motion, useSpring } from "motion/react";
import { pointer } from "../../lib/pointer";
import { palette as c } from "../../lib/palette";

const INK = c.ink;
const S = { stroke: INK, strokeWidth: 4.5, strokeLinejoin: "round", strokeLinecap: "round" };

/* An eye whose pupil tracks the shared pointer. Offsets are in viewBox units. */
function Eye({ cx, cy, r = 15, pupil = 0.5, delay = 0 }) {
  const ref = useRef(null);
  const spring = { stiffness: 260, damping: 20, mass: 0.6 };
  const px = useSpring(0, spring);
  const py = useSpring(0, spring);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const b = el.getBoundingClientRect();
      if (!b.width) return;
      const dx = pointer.x.get() - (b.left + b.width / 2);
      const dy = pointer.y.get() - (b.top + b.height / 2);
      const pull = Math.min(1, Math.hypot(dx, dy) / 180);
      const max = r * (1 - pupil) * 0.9;
      const a = Math.atan2(dy, dx);
      px.set(Math.cos(a) * max * pull);
      py.set(Math.sin(a) * max * pull);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    schedule();
    const offX = pointer.x.on("change", schedule);
    const offY = pointer.y.on("change", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      offX();
      offY();
      window.removeEventListener("scroll", schedule);
      cancelAnimationFrame(raf);
    };
  }, [px, py, r, pupil]);

  return (
    <g className="eye" style={{ animationDelay: `${delay}s` }}>
      <circle ref={ref} cx={cx} cy={cy} r={r} fill="#fff" {...S} strokeWidth={4} />
      <motion.circle cx={cx} cy={cy} r={r * pupil} fill={INK} style={{ x: px, y: py }} />
    </g>
  );
}

function starPath(cx, cy, outer, inner, points = 5) {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 ? inner : outer;
    const a = (Math.PI / points) * i - Math.PI / 2;
    d += `${i ? "L" : "M"}${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`;
  }
  return d + "Z";
}
const STAR = starPath(100, 108, 90, 48);

// Eight rounded-off triangles around the sun's face.
const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI / 4) * i - Math.PI / 2;
  const pt = (r, da) => `${(100 + Math.cos(a + da) * r).toFixed(1)} ${(100 + Math.sin(a + da) * r).toFixed(1)}`;
  return `M${pt(58, -0.2)}L${pt(94, 0)}L${pt(58, 0.2)}Z`;
});

const shapes = {
  blob: (body, d) => (
    <>
      <ellipse cx="100" cy="186" rx="58" ry="8" fill={INK} opacity=".15" />
      <path
        d="M100 24C152 20 184 58 178 106C173 152 144 180 98 178C50 176 20 150 22 104C24 60 50 28 100 24Z"
        fill={body}
        {...S}
      />
      <Eye cx={76} cy={94} r={17} delay={d} />
      <Eye cx={124} cy={90} r={17} delay={d} />
      <path d="M82 128Q100 146 120 126" fill="none" {...S} />
    </>
  ),
  star: (body, d) => (
    <>
      <path d={STAR} fill={body} {...S} />
      <Eye cx={100} cy={104} r={24} pupil={0.45} delay={d} />
      <path d="M86 142Q100 152 114 142" fill="none" {...S} />
    </>
  ),
  ghost: (body, d) => (
    <>
      <path
        d="M40 178V92A60 60 0 0 1 160 92V178L140 162L120 178L100 162L80 178L60 162Z"
        fill={body}
        {...S}
      />
      <Eye cx={78} cy={96} r={15} delay={d} />
      <Eye cx={122} cy={96} r={15} delay={d} />
      <ellipse cx="100" cy="136" rx="10" ry="14" fill={INK} />
    </>
  ),
  robot: (body, d) => (
    <>
      <path d="M100 52V26" {...S} />
      <circle cx="100" cy="20" r="10" fill={c.tomato} {...S} strokeWidth={4} />
      <rect x="28" y="92" width="14" height="34" rx="6" fill={body} {...S} strokeWidth={4} />
      <rect x="158" y="92" width="14" height="34" rx="6" fill={body} {...S} strokeWidth={4} />
      <rect x="40" y="52" width="120" height="120" rx="24" fill={body} {...S} />
      <Eye cx={76} cy={100} r={17} delay={d} />
      <Eye cx={124} cy={100} r={17} delay={d} />
      <rect x="74" y="134" width="52" height="16" rx="8" fill={INK} />
      <path d="M86 134V150M100 134V150M114 134V150" stroke={body} strokeWidth="3" />
    </>
  ),
  cat: (body, d) => (
    <>
      <path
        d="M40 74L48 20L90 52Q100 49 110 52L152 20L160 74Q178 104 164 142Q144 180 100 180Q56 180 36 142Q22 104 40 74Z"
        fill={body}
        {...S}
      />
      <path d="M58 44L62 62L74 56Z M142 44L138 62L126 56Z" fill={c.blush} />
      <Eye cx={76} cy={108} r={16} delay={d} />
      <Eye cx={124} cy={108} r={16} delay={d} />
      <path d="M94 132L106 132L100 140Z" fill={INK} {...S} strokeWidth={4} />
      <path d="M100 140Q92 152 84 146M100 140Q108 152 116 146" fill="none" {...S} strokeWidth={4} />
      <path d="M58 138L22 132M58 146L24 152M142 138L178 132M142 146L176 152" {...S} strokeWidth={4} />
    </>
  ),
  cloud: (body, d) => (
    <>
      <path
        d="M56 152Q20 152 22 118Q24 88 56 88Q60 48 100 46Q142 46 148 82Q180 82 180 116Q180 152 146 152Z"
        fill={body}
        {...S}
      />
      <Eye cx={80} cy={110} r={14} delay={d} />
      <Eye cx={120} cy={110} r={14} delay={d} />
      <path d="M90 134Q100 140 110 134" fill="none" {...S} strokeWidth={4} />
    </>
  ),
  sun: (body, d) => (
    <>
      <g className="sun__rays">
        {SUN_RAYS.map((p, i) => (
          <path key={i} d={p} fill={body} {...S} strokeWidth={4} />
        ))}
      </g>
      <circle cx="100" cy="100" r="56" fill={body} {...S} />
      <ellipse cx="68" cy="118" rx="10" ry="6" fill={c.tomato} opacity=".35" />
      <ellipse cx="132" cy="118" rx="10" ry="6" fill={c.tomato} opacity=".35" />
      <Eye cx={80} cy={96} r={14} delay={d} />
      <Eye cx={120} cy={96} r={14} delay={d} />
      <path d="M84 124Q100 140 116 124" fill="none" {...S} />
    </>
  ),

  planet: (body, d) => (
    <>
      {/* The ring is drawn twice: its far side behind the planet, its near side in front. */}
      <g transform="rotate(-14 100 118)">
        <ellipse cx="100" cy="118" rx="92" ry="26" fill="none" stroke={INK} strokeWidth="14" />
        <ellipse cx="100" cy="118" rx="92" ry="26" fill="none" stroke={c.butter} strokeWidth="6" />
      </g>
      <circle cx="100" cy="96" r="58" fill={body} {...S} />
      <g transform="rotate(-14 100 118)">
        <path d="M8 118A92 26 0 0 0 192 118" fill="none" stroke={INK} strokeWidth="14" strokeLinecap="round" />
        <path d="M8 118A92 26 0 0 0 192 118" fill="none" stroke={c.butter} strokeWidth="6" strokeLinecap="round" />
      </g>
      <Eye cx={80} cy={78} r={13} delay={d} />
      <Eye cx={120} cy={78} r={13} delay={d} />
      <path d="M90 98Q100 106 110 98" fill="none" {...S} strokeWidth={4} />
    </>
  ),
  mushroom: (body, d) => (
    <>
      <rect x="60" y="100" width="80" height="80" rx="26" fill={c.cream} {...S} />
      <path d="M22 110C22 58 58 26 100 26C142 26 178 58 178 110Q100 124 22 110Z" fill={body} {...S} />
      <circle cx="68" cy="66" r="10" fill={c.cream} />
      <circle cx="116" cy="50" r="8" fill={c.cream} />
      <circle cx="148" cy="84" r="9" fill={c.cream} />
      <circle cx="100" cy="90" r="6" fill={c.cream} />
      <Eye cx={86} cy={140} r={11} delay={d} />
      <Eye cx={114} cy={140} r={11} delay={d} />
      <path d="M92 162Q100 168 108 162" fill="none" {...S} strokeWidth={4} />
    </>
  ),
  flower: (body, d) => (
    <>
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const a = (Math.PI / 3) * k - Math.PI / 2;
        return (
          <circle key={k} cx={100 + Math.cos(a) * 54} cy={100 + Math.sin(a) * 54} r="32" fill={body} {...S} strokeWidth={4} />
        );
      })}
      <circle cx="100" cy="100" r="46" fill={c.butter} {...S} />
      <Eye cx={84} cy={96} r={12} delay={d} />
      <Eye cx={116} cy={96} r={12} delay={d} />
      <path d="M88 118Q100 128 112 118" fill="none" {...S} strokeWidth={4} />
    </>
  ),
  monitor: (body, d) => (
    <>
      <path d="M86 150L80 172H120L114 150Z" fill={body} {...S} strokeWidth={4} />
      <rect x="58" y="168" width="84" height="14" rx="7" fill={body} {...S} strokeWidth={4} />
      <rect x="24" y="30" width="152" height="122" rx="18" fill={body} {...S} />
      <rect x="40" y="46" width="120" height="90" rx="8" fill={INK} />
      <Eye cx={80} cy={86} r={14} delay={d} />
      <Eye cx={120} cy={86} r={14} delay={d} />
      <path d="M88 112Q100 122 112 112" fill="none" stroke={c.cream} strokeWidth="4.5" strokeLinecap="round" />
    </>
  ),
};


export default function Character({ type, body = c.butter, blink = 0, className = "", style }) {
  const draw = shapes[type] ?? shapes.blob;
  return (
    <svg viewBox="0 0 200 200" className={`char ${className}`} style={style} aria-hidden="true">
      {draw(body, blink)}
    </svg>
  );
}
