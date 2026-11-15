// The ridge: a pixel Tuwaiq escarpment, oldest answer on the left, each new one on a
// new ledge to the right. Canvas tiles draw the sky and ground; signs, poles, flags
// and climbers sit on a layer above. Only this box scrolls sideways.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Character from "../components/character/Character";
import { colourOf } from "./colour";
import { drawTile, geometry, groundY, latestScroll, ledgeAt, trackWidth } from "./terrain";

const TILE = 4096;
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useStageSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    const read = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function Tiles({ g, width }) {
  const tiles = [];
  for (let x0 = 0; x0 < width; x0 += TILE) tiles.push([x0, Math.min(TILE, width - x0)]);
  return tiles.map(([x0, w]) => <Tile key={x0} g={g} x0={x0} w={w} />);
}

function Tile({ g, x0, w }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const cv = ref.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(g.H * dpr);
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTile(ctx, g, x0, w);
  }, [g, x0, w]);
  return <canvas ref={ref} className="ridge__tile" style={{ left: x0, width: w, height: g.H }} aria-hidden="true" />;
}

/* One answer: a sign on its row, a pole down to its ledge, a flag in the member's
   colour; and, when it has just arrived, the member's character climbing up first. */
function AnswerSign({ answer, i, g, width, animate, leader, onHide }) {
  const led = ledgeAt(g, i);
  const top = g.rows[led.row];
  const left = Math.max(6, Math.min(width - g.signW - 6, led.x - g.signW / 2));
  const colour = colourOf(answer.member);
  const signRef = useRef(null);
  const poleRef = useRef(null);
  const flagRef = useRef(null);
  const climberRef = useRef(null);
  const [climbing, setClimbing] = useState(() => animate && !reduceMotion());
  const [asking, setAsking] = useState(false);

  // The climb, about 1.5s: hop up the ground to the ledge, the pole grows, the sign pops.
  // Measured once, when it arrives; later re-renders leave it running.
  useLayoutEffect(() => {
    if (!climbing) return;
    const size = g.climber;
    const fromX = Math.max(size / 2, led.x - g.from);
    const midX = (fromX + led.x) / 2;
    const pts = [
      [fromX, groundY(g, fromX)],
      [midX, Math.min(groundY(g, fromX), groundY(g, midX))],
      [led.x, led.y],
    ];
    const frames = [];
    pts.forEach(([x, y], j) => {
      frames.push({ transform: `translate(${x - size / 2}px, ${y - size}px)` });
      const next = pts[j + 1];
      if (next) frames.push({ transform: `translate(${(x + next[0]) / 2 - size / 2}px, ${Math.min(y, next[1]) - size - 28}px)` });
    });
    const pop = [
      { transform: "scale(.2)", opacity: 0 },
      { transform: "scale(1)", opacity: 1 },
    ];
    const popTiming = { duration: 300, delay: 1260, easing: "steps(6, end)", fill: "backwards" };
    const anims = [
      climberRef.current.animate(frames, { duration: 1100, easing: "steps(14, end)", fill: "forwards" }),
      climberRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, delay: 1360, easing: "steps(4, end)", fill: "forwards" }),
      poleRef.current.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 260, delay: 1100, easing: "steps(6, end)", fill: "backwards" }),
      signRef.current.animate(pop, popTiming),
      flagRef.current.animate(pop, popTiming),
    ];
    let live = true;
    Promise.all(anims.map((a) => a.finished))
      .then(() => live && setClimbing(false))
      .catch(() => {});
    return () => {
      live = false;
    };
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="post" style={{ left, top, width: g.signW, height: Math.max(0, led.y - top) }}>
        <div
          ref={signRef}
          className={`sign${leader ? " sign--leader" : ""}`}
          style={{ "--c": colour }}
          onClick={leader ? () => setAsking((a) => !a) : undefined}
          role={leader ? "button" : undefined}
          tabIndex={leader ? 0 : undefined}
          onKeyDown={leader ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setAsking((a) => !a)) : undefined}
          aria-label={leader ? `Answer from ${answer.member.name}. Press to hide it.` : undefined}
        >
          <div className="sign__who">
            <span className="sign__icon">
              <Character type={answer.member.avatar.char} body={colour} wear={answer.member.avatar.wear} />
            </span>
            <b dir="auto">{answer.member.name}</b>
          </div>
          <p dir="auto">{answer.text}</p>
          {asking && (
            <button
              type="button"
              className="btn btn--danger sign__hide"
              onClick={(e) => {
                e.stopPropagation();
                onHide(answer.id);
              }}
            >
              HIDE
            </button>
          )}
        </div>
        <div className="post__stem">
          <div ref={poleRef} className="pole" style={{ left: led.x - left - 2 }} />
          <i ref={flagRef} className="flag" style={{ left: led.x - left + 2, background: colour }} />
        </div>
      </div>
      {climbing && (
        <div ref={climberRef} className="climber" style={{ width: g.climber, height: g.climber }} aria-hidden="true">
          <Character type={answer.member.avatar.char} body={colour} wear={answer.member.avatar.wear} />
        </div>
      )}
    </>
  );
}

export default function Ridge({ answers, fresh, loaded, present, leader, onHide, emptyText }) {
  const stageRef = useRef(null);
  const { w, h } = useStageSize(stageRef);
  // Same object while the size stays the same, so tiles aren't redrawn for nothing.
  const g = useMemo(() => (w && h ? { ...geometry(w, h, present), present } : null), [w, h, present]);
  const n = answers.length;
  const width = g ? trackWidth(g, n) : 0;
  // Following = at (or near) the right end, so new answers scroll into view.
  const follow = useRef(true);
  const autoUntil = useRef(0);
  const [showJump, setShowJump] = useState(false);
  const lastId = useRef(null);
  const presentRef = useRef(present);
  useEffect(() => {
    presentRef.current = present;
  }, [present]);

  const toLatest = useCallback(
    (smooth) => {
      const st = stageRef.current;
      if (!st || !g) return;
      autoUntil.current = performance.now() + (smooth ? 900 : 50);
      st.scrollTo({ left: latestScroll(g, n), behavior: smooth && !reduceMotion() ? "smooth" : "auto" });
      follow.current = true;
      setShowJump(false);
    },
    [g, n]
  );

  // A new answer on the right: follow it if we're at the end (or presenting), otherwise
  // leave the reader where they are and offer the way back.
  useLayoutEffect(() => {
    if (!g) return;
    const newest = answers.at(-1)?.id ?? null;
    const changed = newest !== lastId.current;
    lastId.current = newest;
    if (!changed) return;
    if (follow.current || presentRef.current) toLatest(fresh.has(newest));
    else setShowJump(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, answers]);

  // New size (resize, presentation mode): keep following if we were.
  useLayoutEffect(() => {
    if (g && (follow.current || present)) toLatest(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  const onScroll = () => {
    // Our own smooth scroll passes through "not at the end" on its way; ignore it.
    if (performance.now() < autoUntil.current) return;
    const st = stageRef.current;
    const atEnd = st.scrollLeft + st.clientWidth >= width - (g.small ? 240 : 380);
    follow.current = atEnd;
    setShowJump(!atEnd && n > 0);
  };

  // A mouse wheel scrolls the ridge sideways (trackpads already do).
  useEffect(() => {
    const st = stageRef.current;
    const wheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.ctrlKey) return;
      const max = st.scrollWidth - st.clientWidth;
      if (max <= 0) return;
      e.preventDefault();
      st.scrollLeft += e.deltaY;
    };
    st.addEventListener("wheel", wheel, { passive: false });
    return () => st.removeEventListener("wheel", wheel);
  }, []);

  return (
    <div className="ridge">
      <section ref={stageRef} className="stage" onScroll={g ? onScroll : undefined} aria-label="Answers on the mountain, oldest on the left">
        {g && (
          <div className="track" style={{ width, height: g.H }}>
            <Tiles g={g} width={width} />
            <div className="layer">
              {answers.map((a, i) => (
                <AnswerSign key={a.id} answer={a} i={i} g={g} width={width} animate={fresh.has(a.id)} leader={leader} onHide={onHide} />
              ))}
              {!n && (
                <div className="empty" style={{ width: g.vw }}>
                  {loaded ? emptyText : "LOADING…"}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
      {showJump && !present && (
        <button type="button" className="btn btn--pri jump" onClick={() => toLatest(true)}>
          LATEST →
        </button>
      )}
    </div>
  );
}

