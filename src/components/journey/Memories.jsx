import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { gsap, useGSAP, MOTION_OK } from "../../lib/gsap";
import { BadgeMark } from "../badges/Badge";
import "./Memories.css";

const ARABIC = /[؀-ۿ]/;

// Undeveloped film: dark, brown, soft. Developing tweens every function to its clear value.
const FOGGY = "sepia(1) brightness(0.32) contrast(0.6) saturate(0.3) blur(4px)";
const CLEAR = "sepia(0) brightness(1) contrast(1) saturate(1) blur(0px)";

// Where the photo at `pos` in the pile sits: the top one nearly straight, the rest
// fanned out a little. Deterministic, so the pile looks the same every time.
function slot(pos) {
  if (pos === 0) return { x: 0, y: 0, rotation: -2 };
  const p = Math.min(pos, 6);
  return { x: ((p * 53) % 23) - 11, y: ((p * 29) % 15) - 4 + p * 3, rotation: ((p * 37) % 19) - 9 };
}

// Each photo gets the instant-film format closest to its shape, so nothing important
// gets cropped: wide (Instax Wide, for group photos), square, or tall (Instax Mini).
function shapeOf(size) {
  if (!size) return "square";
  const ratio = size.w / size.h;
  return ratio > 1.2 ? "wide" : ratio < 0.85 ? "tall" : "square";
}

const DUST = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 61) % 100}%`,
  top: `${(i * 37 + 11) % 100}%`,
  size: 2 + ((i * 7) % 4),
}));

/**
 * A milestone's memories: the camera flashes, Polaroids shoot out of its node and
 * pile up, and each one develops as it reaches the top. Drag (or the arrows) to
 * flip through them. `mode` is "photos", or "blank" for a milestone without photos.
 */
export default function Memories({ milestone, photos, mode, caption, note, badge, origin, onClose }) {
  const root = useRef(null);
  const stage = useRef(null);
  const closeBtn = useRef(null);
  const cards = useRef([]); // wrapper element per photo index (GSAP moves these)
  const motionOf = useRef([]); // { x, y } motion values per photo index (dragging moves these)
  const developed = useRef(new Set());
  const busy = useRef(true); // until the intro has landed
  const closing = useRef(false);
  const [order, setOrder] = useState(() => photos.map((_, i) => i));
  const orderRef = useRef(order);
  // Pixel sizes, from the admin panel; older photos report theirs once loaded.
  const [sizes, setSizes] = useState(() => photos.map((p) => (p.w && p.h ? { w: p.w, h: p.h } : null)));
  const n = photos.length;
  const blank = mode === "blank";

  const reduced = () => !window.matchMedia(MOTION_OK).matches;

  // From the middle of the pile to the milestone's node on the page.
  const toOrigin = () => {
    const s = stage.current.getBoundingClientRect();
    const o = origin.getBoundingClientRect();
    return { x: o.left + o.width / 2 - (s.left + s.width / 2), y: o.top + o.height / 2 - (s.top + s.height / 2) };
  };

  const updateOrder = (next) => {
    orderRef.current = next;
    setOrder(next);
  };

  /* A photo comes up: the fog clears, it gets a shake, the caption writes itself in. */
  const develop = (idx, instant = reduced()) => {
    if (developed.current.has(idx)) return;
    developed.current.add(idx);
    const card = cards.current[idx];
    const q = gsap.utils.selector(card);
    // The caption is written in from its start: the left, or the right for Arabic.
    const hidden = q(".mem-pol__caption")[0]?.dir === "rtl" ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)";
    // Blank film never clears all the way.
    const fogTo = blank ? 0.55 : 0;
    if (instant) {
      gsap.set(q(".mem-photo__img"), { filter: CLEAR });
      gsap.set(q(".mem-photo__fog"), { autoAlpha: fogTo });
      gsap.set(q(".mem-pol__caption"), { clipPath: "inset(0% 0% 0% 0%)" });
      return;
    }
    gsap
      .timeline()
      .to(q(".mem-photo__fog"), { autoAlpha: fogTo, duration: 2.4, ease: "power1.inOut" }, 0)
      .fromTo(q(".mem-photo__img"), { filter: FOGGY }, { filter: CLEAR, duration: 2.6, ease: "power2.inOut" }, 0)
      // Everyone shakes a Polaroid.
      .to(q(".mem-pol"), { keyframes: { rotation: [0, -4, 3.5, -2.5, 2, -1, 0] }, duration: 0.7, ease: "none" }, 0.05)
      .fromTo(q(".mem-pol__caption"), { clipPath: hidden }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "power1.inOut" }, 1.1);
  };

  const { contextSafe } = useGSAP(
    (_, safe) => {
      const o = toOrigin();
      const initial = orderRef.current;
      const top = initial[0];

      // A fresh start each run (StrictMode reverts the first one, developed photos included).
      developed.current = new Set();

      if (reduced()) {
        initial.forEach((idx, pos) => gsap.set(cards.current[idx], slot(pos)));
        gsap.fromTo(".mem__backdrop, .mem__hud", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 });
        gsap.set(".mem__stamp", { autoAlpha: 1 });
        develop(top, true);
        busy.current = false;
        return;
      }

      // Dust drifting in the light, all the while it's open.
      gsap.utils.toArray(".mem__dust", root.current).forEach((d) => {
        gsap.to(d, {
          x: "random(-40, 40)",
          y: "random(-90, -30)",
          autoAlpha: "random(0.15, 0.7)",
          duration: "random(4, 8)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: "random(0, 2)",
        });
      });

      // Every photo starts tiny, inside the node.
      initial.forEach((idx, pos) => {
        gsap.set(cards.current[idx], { x: o.x, y: o.y, scale: 0.1, rotation: slot(pos).rotation + (pos % 2 ? 50 : -50), autoAlpha: 0 });
      });

      const gap = Math.min(0.14, 1.3 / n);
      const tl = gsap.timeline();
      // Flash, and a film light leak sweeping across.
      tl.fromTo(".mem__flash", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05, ease: "power1.in" }, 0)
        .to(".mem__flash", { autoAlpha: 0, duration: 0.8, ease: "power2.out" }, 0.07)
        .fromTo(".mem__backdrop", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0)
        .fromTo(".mem__leak", { xPercent: -80, autoAlpha: 0 }, { xPercent: 70, autoAlpha: 0.85, duration: 1.5, ease: "power2.inOut" }, 0.05)
        .to(".mem__leak", { autoAlpha: 0, duration: 0.7 }, 1.1);

      // Out of the node, bottom of the pile first, so the top photo lands last.
      [...initial].reverse().forEach((idx, k) => {
        const s = slot(initial.indexOf(idx));
        const el = cards.current[idx];
        const at = 0.2 + k * gap;
        tl.to(el, { autoAlpha: 1, duration: 0.12 }, at)
          // Different eases on x and y: the photos fly in on an arc.
          .to(el, { x: s.x, duration: 0.8, ease: "power2.out" }, at)
          .to(el, { y: s.y, duration: 0.8, ease: "back.out(1.3)" }, at)
          .to(el, { scale: 1, rotation: s.rotation, duration: 0.85, ease: "back.out(1.5)" }, at);
      });

      const landed = 0.2 + (n - 1) * gap + 0.6;
      tl.add(safe(() => develop(top)), landed - 0.2)
        .fromTo(".mem__hud", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, landed)
        .add(() => {
          busy.current = false;
        }, landed);

      // The badge comes down like a rubber stamp, and the whole table jumps.
      if (badge) {
        const at = landed + (blank ? 1.3 : 2.2);
        tl.fromTo(
          ".mem__stamp",
          { autoAlpha: 0, scale: 2.8, rotation: -40 },
          { autoAlpha: 1, scale: 1, rotation: -14, duration: 0.3, ease: "power4.in" },
          at
        )
          .to(stage.current, { keyframes: { x: [0, -8, 7, -4, 3, 0], y: [0, 5, -3, 2, 0] }, duration: 0.38, ease: "none" }, at + 0.3)
          .fromTo(".mem__stamp-ring", { scale: 0.7, autoAlpha: 0.9 }, { scale: 1.7, autoAlpha: 0, duration: 0.6, ease: "power2.out" }, at + 0.3);
      }
    },
    { scope: root }
  );

  // When the order changes, the rest of the pile shuffles up into place.
  // Only on a real change: not on mount, nor StrictMode's second run (the intro places them then).
  const stacked = useRef(order);
  useGSAP(
    () => {
      if (stacked.current === order) return;
      stacked.current = order;
      order.forEach((idx, pos) => {
        gsap.to(cards.current[idx], { ...slot(pos), duration: reduced() ? 0 : 0.55, ease: "power3.out", overwrite: "auto" });
      });
    },
    { dependencies: [order], scope: root }
  );

  const developSafe = (idx) => contextSafe(develop)(idx);

  // A photo in hand goes above everything, the badge stamp included. Back down, it
  // takes the place in the pile that React gave it.
  const lift = (idx, up) => {
    const el = cards.current[idx];
    if (el) el.style.zIndex = up ? 300 : n - orderRef.current.indexOf(idx);
  };
  const spring = { type: "spring", stiffness: 170, damping: 24 };
  const away = () => window.innerWidth * 0.55 + 260;

  /* The top photo flies off and slides back in at the bottom of the pile. */
  const flip = async (dir) => {
    const now = orderRef.current;
    const { x, y } = motionOf.current[now[0]];
    if (busy.current || closing.current || n < 2) {
      lift(now[0], false);
      animate(x, 0, spring);
      animate(y, 0, spring);
      return;
    }
    busy.current = true;
    const idx = now[0];
    lift(idx, true);
    await Promise.all([animate(x, dir * away(), { duration: 0.3, ease: [0.4, 0, 1, 0.6] }), animate(y, y.get() - 50, { duration: 0.3 })]);
    const next = [...now.slice(1), idx];
    updateOrder(next);
    lift(idx, false);
    developSafe(next[0]);
    busy.current = false;
    animate(x, 0, spring);
    animate(y, 0, spring);
  };

  /* The bottom photo comes back from where it went, onto the top. */
  const back = () => {
    const now = orderRef.current;
    if (busy.current || closing.current || n < 2) return;
    const idx = now.at(-1);
    const { x, y } = motionOf.current[idx];
    x.set(-away());
    y.set(-50);
    updateOrder([idx, ...now.slice(0, -1)]);
    animate(x, 0, spring);
    animate(y, 0, spring);
  };

  /* Everything goes back into the node it came out of. */
  const close = () => contextSafe(closeNow)();
  function closeNow() {
    if (closing.current) return;
    closing.current = true;
    if (reduced()) {
      gsap.to(root.current, { autoAlpha: 0, duration: 0.2, onComplete: onClose });
      return;
    }
    const o = toOrigin();
    const tl = gsap.timeline({ onComplete: onClose });
    tl.to(".mem__hud, .mem__stamp", { autoAlpha: 0, duration: 0.2 }, 0);
    orderRef.current.forEach((idx, k) => {
      const at = 0.05 + k * Math.min(0.06, 0.6 / n);
      tl.to(cards.current[idx], { x: o.x, y: o.y, scale: 0.08, rotation: k % 2 ? -35 : 35, duration: 0.5, ease: "power3.in" }, at).to(
        cards.current[idx],
        { autoAlpha: 0, duration: 0.1 },
        at + 0.42
      );
    });
    tl.to(".mem__backdrop", { autoAlpha: 0, duration: 0.4 }, "-=0.3");
  }

  // Keys, scroll lock, focus.
  const keys = useRef();
  useEffect(() => {
    keys.current = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") flip(-1);
      else if (e.key === "ArrowLeft") back();
    };
  });
  useEffect(() => {
    const onKey = (e) => keys.current(e);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  const register = useCallback((idx, values) => {
    motionOf.current[idx] = values;
  }, []);

  const onSize = useCallback((idx, w, h) => {
    setSizes((all) => (all[idx] ? all : all.map((s, i) => (i === idx ? { w, h } : s))));
  }, []);

  const onDragEnd = (info) => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > 110 || Math.abs(velocity.x) > 650) flip(Math.sign(offset.x || velocity.x));
    else {
      lift(orderRef.current[0], false);
      const { x, y } = motionOf.current[orderRef.current[0]];
      animate(x, 0, spring);
      animate(y, 0, spring);
    }
  };

  const top = order[0];
  const titleId = `mem-title-${milestone.id}`;

  return createPortal(
    <div className="mem" ref={root} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="mem__backdrop" onClick={close}>
        <span className="mem__grain" />
        {DUST.map((d, i) => (
          <span key={i} className="mem__dust" style={{ left: d.left, top: d.top, width: d.size, height: d.size }} />
        ))}
      </div>
      <span className="mem__leak" aria-hidden="true" />

      <header className="mem__hud mem__head">
        <div>
          <p className="mem__when mono">
            {milestone.when} · {blank ? "memories" : `${n} ${n === 1 ? "memory" : "memories"}`}
          </p>
          <h2 id={titleId} className="mem__title display">
            {milestone.title}
          </h2>
        </div>
        <button ref={closeBtn} type="button" className="mem__close" onClick={close} aria-label="Close">
          ✕
        </button>
      </header>

      <div className="mem__stage" ref={stage}>
        {photos.map((p, i) => {
          const pos = order.indexOf(i);
          return (
            <div
              key={i}
              className="mem-card"
              data-shape={shapeOf(sizes[i])}
              ref={(el) => (cards.current[i] = el)}
              style={{ zIndex: n - pos }}
              aria-hidden={i !== top}
            >
              <Polaroid
                index={i}
                photo={p}
                blank={blank}
                caption={blank ? caption : p.caption}
                note={blank ? note : null}
                alt={p.caption || `Photo ${i + 1} from ${milestone.title}`}
                isTop={i === top && !blank}
                register={register}
                onSize={onSize}
                onDragStart={() => lift(i, true)}
                onDragEnd={onDragEnd}
              />
            </div>
          );
        })}
        {badge && (
          // It sits on the top photo's corner, wherever that is for its shape.
          <div className="mem__stamp" data-shape={shapeOf(sizes[top])} aria-label={`${badge.name} badge`}>
            <span className="mem__stamp-ring" />
            <svg viewBox="0 0 120 120" className="mem__stamp-text" aria-hidden="true">
              <defs>
                <path id="mem-stamp-path" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0" />
              </defs>
              <circle cx="60" cy="60" r="57" />
              <circle cx="60" cy="60" r="35" />
              <text>
                <textPath href="#mem-stamp-path" startOffset="0">
                  {`BADGE UNLOCKED ★ ${badge.name.toUpperCase()} ★ `}
                </textPath>
              </text>
            </svg>
            <BadgeMark badge={badge} size="3.4rem" />
          </div>
        )}
      </div>

      {!blank && (
        <footer className="mem__hud mem__nav">
          <button type="button" className="mem__arrow" onClick={back} aria-label="Previous photo" disabled={n < 2}>
            ←
          </button>
          <p className="mem__count mono" aria-live="polite">
            <strong>{String(top + 1).padStart(2, "0")}</strong> / {String(n).padStart(2, "0")}
          </p>
          <button type="button" className="mem__arrow" onClick={() => flip(-1)} aria-label="Next photo" disabled={n < 2}>
            →
          </button>
          {n > 1 && <p className="mem__hint mono">drag a photo to flip it</p>}
        </footer>
      )}

      <span className="mem__flash" aria-hidden="true" />
    </div>,
    document.body
  );
}

/* One Polaroid. Layers: drag (motion) → paper (GSAP shakes it while it develops). */
function Polaroid({ index, photo, blank, caption, note, alt, isTop, register, onSize, onDragStart, onDragEnd }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-360, 0, 360], [-24, 0, 24]);

  useEffect(() => register(index, { x, y }), [register, index, x, y]);

  const rtl = ARABIC.test(caption ?? "");

  return (
    <motion.div
      className={`mem-drag${isTop ? " is-top" : ""}`}
      style={{ x, y, rotate }}
      drag={isTop}
      dragMomentum={false}
      whileDrag={{ scale: 1.04, cursor: "grabbing" }}
      onDragStart={onDragStart}
      onDragEnd={(_, info) => onDragEnd(info)}
    >
      <div className="mem-pol">
        <div className="mem-photo">
          {blank ? (
            <span className="mem-photo__img mem-photo__blank" aria-hidden="true">
              ?
            </span>
          ) : (
            <img
              className="mem-photo__img"
              src={photo.url}
              alt={alt}
              draggable={false}
              decoding="async"
              onLoad={(e) => onSize(index, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
            />
          )}
          <span className="mem-photo__fog" aria-hidden="true" />
        </div>
        <p className="mem-pol__caption" lang={rtl ? "ar" : undefined} dir={rtl ? "rtl" : "ltr"}>
          {caption}
          {note && <small>{note}</small>}
        </p>
      </div>
    </motion.div>
  );
}
