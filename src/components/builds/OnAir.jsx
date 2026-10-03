import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ago, getTrack, isCollab, kindOf } from "../../data/projects";
import { members, shortName } from "../../data/members";
import { color } from "../../lib/palette";
import { memberHref } from "../members/useMemberRoute";
import Character from "../character/Character";
import { hueOf, hueVars, stickerOf } from "./hue";

const pad = (n) => String(n).padStart(2, "0");

// Each build's crew pops up from behind the monitor, one after another.
// (Hovering the monitor makes them peek further: that's CSS, in Builds.css.)
const pop = (i) => ({ y: 0, transition: { type: "spring", stiffness: 380, damping: 18, delay: 0.1 + i * 0.06 } });

/* Everything in progress: a guide that counts and lists them (collaborations,
   then projects), and a monitor showing the one picked. */
export default function OnAir({ builds }) {
  const collabs = builds.filter(isCollab);
  const projects = builds.filter((b) => !isCollab(b));
  // Collabs first, then projects: the order ◀ ▶ steps through.
  const order = [...collabs, ...projects];

  const reduce = useReducedMotion();
  const [at, setAt] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const show = (next) => {
    if (!order.length || next === at) return;
    timers.current.forEach(clearTimeout);
    if (reduce) return setAt(next);
    setGlitch(true);
    timers.current = [setTimeout(() => setAt(next), 120), setTimeout(() => setGlitch(false), 300)];
  };
  const step = (dir) => show((at + dir + order.length) % order.length);

  const onKey = (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir || !order.length) return;
    e.preventDefault();
    step(dir);
  };

  const build = order[at];
  return (
    <div className="onair" onKeyDown={onKey}>
      {order.length > 0 && (
        <div className="guide">
          <GuideGroup label="Collabs" builds={collabs} order={order} at={at} onPick={show} />
          <GuideGroup label="Projects" builds={projects} order={order} at={at} onPick={show} />
        </div>
      )}
      <Monitor build={build} index={at} total={order.length} glitch={glitch} onStep={step} />
    </div>
  );
}

/* "Collabs · 02" and a chip per build. The picked one is pressed in. */
function GuideGroup({ label, builds, order, at, onPick }) {
  return (
    <div className="guide__group">
      <p className="guide__label mono">
        {label} <span className="guide__count">{pad(builds.length)}</span>
      </p>
      {builds.length ? (
        <div className="guide__chips">
          {builds.map((b) => {
            const i = order.indexOf(b);
            return (
              <button
                key={b.id}
                type="button"
                className="guide__chip"
                style={hueVars(hueOf(b))}
                aria-pressed={i === at}
                onClick={() => onPick(i)}
              >
                <span className="guide__dot" aria-hidden="true" />
                <span className="guide__name">{b.title}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="guide__none">none right now</p>
      )}
    </div>
  );
}

function Monitor({ build, index, total, glitch, onStep }) {
  const crew = build ? members.filter((m) => build.members.includes(m.id)) : [];
  return (
    <div className="monitor" style={hueVars(build ? hueOf(build) : "#9a93b3")}>
      <div className="monitor__crew">
        <AnimatePresence mode="popLayout">
          {crew.map((m, i) => (
            <motion.a
              key={`${build.id}-${m.id}`}
              href={memberHref(m.id)}
              className="monitor__mate"
              initial={{ y: 50 }}
              animate={pop(i)}
              exit={{ y: 50, transition: { duration: 0.12 } }}
              aria-label={shortName(m)}
              title={shortName(m)}
            >
              <Character type={m.avatar.char} body={color(m.avatar.body)} className="sticker" />
            </motion.a>
          ))}
        </AnimatePresence>
      </div>

      <div className="monitor__frame">
        <span className="monitor__cam" aria-hidden="true" />
        {build && <span className="monitor__sticker mono">{stickerOf(build)}</span>}
        <div className="monitor__screen" aria-live="polite">
          <div className="monitor__picture">{build ? <Picture build={build} index={index} total={total} /> : <NoSignal />}</div>
          {glitch && <span className="monitor__glitch" aria-hidden="true" />}
        </div>
        <div className="monitor__chin">
          <span className="monitor__brand mono">PT</span>
          <span className="monitor__controls">
            <button type="button" className="monitor__btn" onClick={() => onStep(-1)} disabled={total < 2} aria-label="Previous build">
              ◀
            </button>
            <button type="button" className="monitor__btn" onClick={() => onStep(1)} disabled={total < 2} aria-label="Next build">
              ▶
            </button>
            <span className="monitor__led" aria-hidden="true" />
          </span>
        </div>
      </div>
      <div className="monitor__stand" aria-hidden="true">
        <span className="monitor__neck" />
        <span className="monitor__base" />
      </div>
    </div>
  );
}

function Picture({ build, index, total }) {
  const kind = kindOf(build.kind);
  const track = isCollab(build) ? getTrack(build.trackId) : null;
  return (
    <>
      <p className="monitor__status mono">
        <span>
          <span className="monitor__dot" aria-hidden="true" /> Building
        </span>
        <span className="monitor__count">
          {pad(index + 1)} / {pad(total)}
        </span>
      </p>
      <h3 className="monitor__title display">{build.title}</h3>
      {build.note && (
        <p className="monitor__note">
          <span className="monitor__prompt" aria-hidden="true">
            &gt;
          </span>{" "}
          {build.note}
        </p>
      )}
      <p className="monitor__meta mono">
        {(track || build.forLabel) && <span>{track ? `with ${track.name}` : `for ${build.forLabel}`}</span>}
        {kind && (
          <span className="monitor__kind">
            <span aria-hidden="true">{kind.glyph}</span> {kind.label}
          </span>
        )}
        <span>updated {ago(build.updatedAt)}</span>
      </p>
      <span className="monitor__load" aria-hidden="true" />
    </>
  );
}

function NoSignal() {
  return (
    <div className="monitor__nosignal">
      <p className="mono">No signal</p>
      <p className="monitor__note">nothing being built right now</p>
    </div>
  );
}
