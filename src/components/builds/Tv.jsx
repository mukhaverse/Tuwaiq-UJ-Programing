import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ago, getTrack, isCollab, kindOf } from "../../data/projects";
import { members, shortName } from "../../data/members";
import { color } from "../../lib/palette";
import { memberHref } from "../members/useMemberRoute";
import Character from "../character/Character";
import { hueOf, hueVars, stickerOf } from "./hue";

const pad = (n) => String(n).padStart(2, "0");

// Each channel's crew pops up from behind the set, one after another.
// (Hovering the TV makes them peek further: that's CSS, in Builds.css.)
const pop = (i) => ({ y: 0, transition: { type: "spring", stiffness: 380, damping: 18, delay: 0.1 + i * 0.06 } });

/* One channel per build in progress. CH +/− (or the arrow keys) flips through
   them with a burst of static, like an old TV. */
export default function Tv({ builds }) {
  const reduce = useReducedMotion();
  const [ch, setCh] = useState(0);
  const [tuning, setTuning] = useState(false);
  // Bumped on every switch: replays the channel number flash and the antenna wobble.
  const [flips, setFlips] = useState(0);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const count = builds.length;
  const build = builds[ch];
  const crew = build ? members.filter((m) => build.members.includes(m.id)) : [];
  const hue = build ? hueOf(build) : "#9a93b3";

  const flip = (dir) => {
    timers.current.forEach(clearTimeout);
    const next = count ? (ch + dir + count) % count : 0;
    setFlips((f) => f + 1);
    if (reduce) return setCh(next);
    setTuning(true);
    timers.current = [setTimeout(() => setCh(next), 150), setTimeout(() => setTuning(false), 360)];
  };

  const onKey = (e) => {
    const dir = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    flip(dir);
  };

  return (
    <div className="tv" style={hueVars(hue)} onKeyDown={onKey}>
      <motion.svg
        key={`ant-${flips}`}
        className="tv__antenna"
        viewBox="0 0 120 70"
        aria-hidden="true"
        initial={{ rotate: flips ? -6 : 0 }}
        animate={{ rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 6 }}
      >
        <path d="M60 62L22 8M60 62L100 14" />
        <circle cx="22" cy="8" r="5" />
        <circle cx="100" cy="14" r="5" />
        <path d="M44 66a16 12 0 0 1 32 0z" className="tv__dome" />
      </motion.svg>

      <div className="tv__crew">
        <AnimatePresence mode="popLayout">
          {crew.map((m, i) => (
            <motion.a
              key={`${build.id}-${m.id}`}
              href={memberHref(m.id)}
              className="tv__mate"
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

      <div className="tv__set">
        {build && <span className="tv__sticker mono">{stickerOf(build)}</span>}
        <div className="tv__screen" aria-live="polite">
          <div className="tv__picture">{build ? <Channel build={build} number={ch + 1} /> : <NoSignal />}</div>
          {tuning && <span className="tv__static" aria-hidden="true" />}
          {flips > 0 && build && (
            <motion.span
              key={`osd-${flips}`}
              className="tv__osd mono"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 1.1, duration: 0.3 }}
              aria-hidden="true"
            >
              CH {pad(ch + 1)}
            </motion.span>
          )}
        </div>
        <div className="tv__chin">
          <span className="tv__brand mono">
            PT·TV <span className="tv__count">{count ? `${pad(ch + 1)}/${pad(count)}` : "--/--"}</span>
          </span>
          <span className="tv__controls">
            <button type="button" className="tv__btn mono" onClick={() => flip(-1)} aria-label="Previous channel">
              CH −
            </button>
            <button type="button" className="tv__btn mono" onClick={() => flip(1)} aria-label="Next channel">
              CH +
            </button>
            <span className="tv__led" aria-hidden="true" />
          </span>
        </div>
      </div>
      <div className="tv__feet" aria-hidden="true">
        <span />
        <span />
      </div>
    </div>
  );
}

function Channel({ build, number }) {
  const kind = kindOf(build.kind);
  const track = isCollab(build) ? getTrack(build.trackId) : null;
  return (
    <>
      <p className="tv__status mono">
        <span>
          <span className="tv__dot" aria-hidden="true" /> On air · building
        </span>
        <span className="tv__ago">updated {ago(build.updatedAt)}</span>
      </p>
      <h3 className="tv__title display">
        <span className="sr-only">Channel {number}: </span>
        {build.title}
      </h3>
      {build.note && (
        <p className="tv__note">
          <span className="tv__prompt" aria-hidden="true">
            &gt;
          </span>{" "}
          {build.note}
        </p>
      )}
      {(track || build.forLabel || kind) && (
        <p className="tv__meta mono">
          {(track || build.forLabel) && <span>{track ? `with ${track.name}` : `for ${build.forLabel}`}</span>}
          {kind && (
            <span className="tv__kind">
              <span aria-hidden="true">{kind.glyph}</span> {kind.label}
            </span>
          )}
        </p>
      )}
      <span className="tv__load" aria-hidden="true" />
    </>
  );
}

function NoSignal() {
  return (
    <div className="tv__nosignal">
      <p className="mono">No signal</p>
      <p className="tv__note">nothing on air right now</p>
    </div>
  );
}
