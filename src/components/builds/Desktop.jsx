import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { getTrack, isCollab, kindOf, monthOf } from "../../data/projects";
import { members, shortName } from "../../data/members";
import { color } from "../../lib/palette";
import { memberHref } from "../members/useMemberRoute";
import Character from "../character/Character";
import { CYAN, hueOf, hueVars, labelOf } from "./hue";

const EVERY = 6000; // ms on each build before the desktop moves on to the next
const PEEK = 3; // windows peeking out behind the open one
const DENSE_AFTER = 5; // past this many, taskbar tabs shrink to colour squares

const pad = (n) => String(n).padStart(2, "0");
const crewOf = (build) => (build ? members.filter((m) => build.members.includes(m.id)) : []);

/* PT-OS: a little desktop on a monitor. One build open at a time, the next few
   peeking out behind it, a taskbar to switch (grouped into collabs and projects),
   and the shipped ones in a folder. With nobody touching it, it moves through the
   builds on its own, so none of them looks like the main one. */
export default function Desktop({ builds, shipped }) {
  const reduce = useReducedMotion();
  const collabs = builds.filter(isCollab);
  const own = builds.filter((b) => !isCollab(b));
  // Collabs first, then our own: the order the taskbar shows and the desktop steps through.
  const order = [...collabs, ...own];

  const [open, setOpen] = useState(0); // index into order, or "shipped"
  const [auto, setAuto] = useState(true); // false once someone picks something
  const [hover, setHover] = useState(false);
  const root = useRef(null);
  const visible = useInView(root);

  const current = open === "shipped" ? null : order[open];
  const cycling = auto && !reduce && visible && !hover && current && order.length > 1;

  useEffect(() => {
    if (!cycling) return;
    const t = setTimeout(() => setOpen((o) => (o + 1) % order.length), EVERY);
    return () => clearTimeout(t);
  }, [cycling, open, order.length]);

  const pick = (next) => {
    setAuto(false);
    setOpen(next);
  };

  const hue = current ? hueOf(current) : open === "shipped" ? CYAN : undefined;
  return (
    <div
      ref={root}
      className="monitor"
      style={hue ? hueVars(hue) : undefined}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <div className="monitor__crew">
        {crewOf(current).map((m) => (
          <a key={`${current.id}-${m.id}`} href={memberHref(m.id)} className="monitor__mate" aria-label={shortName(m)} title={shortName(m)}>
            <Character type={m.avatar.char} body={color(m.avatar.body)} className="sticker" />
          </a>
        ))}
      </div>

      <div className="monitor__frame">
        <span className="monitor__cam" aria-hidden="true" />
        <div className="monitor__screen">
          <div className="os">
            <MenuBar building={order.length} shipped={shipped.length} />
            <div className="os-desk">
              <button type="button" className="os-folder" aria-pressed={open === "shipped"} onClick={() => pick(open === "shipped" ? 0 : "shipped")}>
                <FolderIcon />
                <span className="os-folder__badge">{shipped.length}</span>
                <span>shipped</span>
              </button>
              {open === "shipped" ? (
                <ShippedWindow builds={shipped} />
              ) : current ? (
                <>
                  <Peeks order={order} open={open} onPick={pick} />
                  <BuildWindow key={current.id} build={current} index={open} total={order.length} />
                </>
              ) : (
                <div className="os-idle">
                  <b>Nothing building</b>
                  <span>The next build shows up here.</span>
                </div>
              )}
            </div>
            {order.length > 0 && (
              <div className={`os-task${order.length > DENSE_AFTER ? " is-dense" : ""}`}>
                <StartIcon />
                <TaskGroup label="Collabs" builds={collabs} order={order} open={open} cycling={cycling} onPick={pick} />
                <TaskGroup label="Projects" builds={own} order={order} open={open} cycling={cycling} onPick={pick} />
              </div>
            )}
          </div>
        </div>
        <div className="monitor__chin">
          <span className="monitor__brand mono">PT</span>
          <span className="monitor__led" aria-hidden="true" />
        </div>
      </div>
      <div className="monitor__stand" aria-hidden="true">
        <span className="monitor__neck" />
        <span className="monitor__base" />
      </div>
    </div>
  );
}

/* Top bar: the counts, and the time. */
function MenuBar({ building, shipped }) {
  const time = useClock();
  return (
    <div className="os-bar">
      <span className="os-bar__logo">PT-OS</span>
      <span className="os-bar__count">
        <span className="os-bar__live" aria-hidden="true" />
        <b>{building}</b> building
      </span>
      <span className="os-bar__count">
        ✓ <b>{shipped}</b> shipped
      </span>
      <span className="os-bar__clock">{time}</span>
    </div>
  );
}

/* The next few builds, peeking out above the open window: furthest at the top. */
function Peeks({ order, open, onPick }) {
  if (order.length < 2) return null;
  const behind = [];
  for (let d = 1; d <= Math.min(PEEK, order.length - 1); d++) behind.push({ i: (open + d) % order.length, d });
  const hidden = order.length - 1 - behind.length;
  return (
    <div className="os-stack">
      {behind.reverse().map(({ i, d }) => {
        const b = order[i];
        return (
          <button key={b.id} type="button" className="os-peek" style={{ ...hueVars(hueOf(b)), "--d": d }} onClick={() => onPick(i)}>
            <span className="os-peek__title">{b.title}</span>
            {d === behind.length && hidden > 0 && <span className="os-peek__more">+{hidden} more</span>}
          </button>
        );
      })}
    </div>
  );
}

function TitleBar({ label, position }) {
  return (
    <div className="os-win__bar">
      <span className="os-win__label">{label}</span>
      {position && <span className="os-win__of">{position}</span>}
      <span className="os-win__ctrls" aria-hidden="true">
        <i>–</i>
        <i>▢</i>
        <i>✕</i>
      </span>
    </div>
  );
}

function BuildWindow({ build, index, total }) {
  const track = isCollab(build) ? getTrack(build.trackId) : null;
  const kind = kindOf(build.kind);
  const crew = crewOf(build);
  return (
    <div className="os-win" style={hueVars(hueOf(build))}>
      <TitleBar label={labelOf(build)} position={`${pad(index + 1)} / ${pad(total)}`} />
      <div className="os-win__body">
        <h3 className="os-win__title">{build.title}</h3>
        {build.note && <p className="os-win__note">{build.note}</p>}
        {track && (
          <p className="os-win__byline">
            <span className="os-win__us">Programming</span>
            <span className="os-win__x">×</span>
            <span className="os-win__them">{track.name}</span>
          </p>
        )}
        <div className="os-win__foot">
          {crew.length > 0 && (
            <span className="os-win__crew">
              {crew.map((m) => (
                <a key={m.id} href={memberHref(m.id)} aria-label={shortName(m)} title={shortName(m)}>
                  <Character type={m.avatar.char} body={color(m.avatar.body)} />
                </a>
              ))}
            </span>
          )}
          {kind && (
            <span className="os-win__kind">
              <span aria-hidden="true">{kind.glyph}</span> {kind.label}
            </span>
          )}
          <span className="os-win__progress">
            building
            <span className="os-win__bar-track" aria-hidden="true" />
          </span>
        </div>
        {/* A collab has a guest: the other track's cursor, wandering about. */}
        {track && (
          <span className="os-guest" aria-hidden="true">
            <svg viewBox="0 0 16 22">
              <path d="M1 1l13 12-6 1 3 7-3 1-3-7-4 4z" />
            </svg>
            <span>{track.name}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function ShippedWindow({ builds }) {
  return (
    <div className="os-win" style={hueVars(CYAN)}>
      <TitleBar label={`shipped · ${builds.length} ${builds.length === 1 ? "build" : "builds"}`} />
      {builds.length ? (
        <ul className="os-files">
          {builds.map((b) => (
            <li key={b.id}>
              <span className="os-files__ok" aria-hidden="true">
                ✓
              </span>
              <span className="os-files__name">{b.title}</span>
              <span className="os-chip" style={hueVars(hueOf(b))}>
                {labelOf(b)}
              </span>
              <span className="os-files__when">{monthOf(b.finishedAt ?? b.updatedAt)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="os-files__empty">Empty, for now. The first thing we ship lands here.</p>
      )}
    </div>
  );
}

function TaskGroup({ label, builds, order, open, cycling, onPick }) {
  if (!builds.length) return null;
  return (
    <div className="os-task__group">
      <span className="os-task__label">
        {label} <b>{builds.length}</b>
      </span>
      {builds.map((b) => {
        const i = order.indexOf(b);
        const on = i === open;
        return (
          <button key={b.id} type="button" className="os-tab" style={hueVars(hueOf(b))} aria-pressed={on} title={b.title} onClick={() => onPick(i)}>
            <i aria-hidden="true" />
            <span>{b.title}</span>
            {/* Fills up while this build is on screen; remounts (and restarts) on every switch. */}
            {on && cycling && <b key={i} className="os-tab__timer" style={{ "--every": `${EVERY}ms` }} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

/* Four panes in the brand colours. Just for looks. */
function StartIcon() {
  return (
    <svg className="os-task__start" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="1" y="1" width="8" height="8" fill="#a380ff" />
      <rect x="11" y="1" width="8" height="8" fill="#57e3d8" />
      <rect x="1" y="11" width="8" height="8" fill="#f4a664" />
      <rect x="11" y="11" width="8" height="8" fill="#f2c14e" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 64 50" aria-hidden="true">
      <path d="M2 8a4 4 0 0 1 4-4h18l6 6h28a4 4 0 0 1 4 4v30a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill="#57e3d8" />
      <path d="M2 16h60v28a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" fill="#3fb8ae" />
    </svg>
  );
}

/* The visitor's own time, HH:MM, kept current. */
function useClock() {
  const read = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const [time, setTime] = useState(read);
  useEffect(() => {
    const t = setInterval(() => setTime(read()), 20000);
    return () => clearInterval(t);
  }, []);
  return time;
}

/* Whether an element is on screen, so the desktop only moves along while someone can see it. */
function useInView(ref) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return seen;
}
