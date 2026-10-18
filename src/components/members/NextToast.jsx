import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { announcement } from "../../data/announcement";

// Closing it hides this announcement for the rest of the visit; a new one shows again.
const KEY = "pt:next-hidden";

function wasClosed() {
  try {
    return sessionStorage.getItem(KEY) === announcement?.title;
  } catch {
    return false;
  }
}

/* A small card pinned to the bottom of the screen that points at the purple
   "Up next" tile, so nobody scrolls past it. It steps aside while the tile is
   on screen; clicking it jumps to the tile and flashes it. */
export default function NextToast() {
  const [closed, setClosed] = useState(wasClosed);
  const [ready, setReady] = useState(false);
  const [tileOnScreen, setTileOnScreen] = useState(false);

  // Let the hero's intro play first.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const tile = document.querySelector(".promo");
    if (!tile) return;
    const io = new IntersectionObserver(([e]) => setTileOnScreen(e.isIntersecting), { threshold: 0.25 });
    io.observe(tile);
    return () => io.disconnect();
  }, []);

  const a = announcement;
  if (!a) return null;

  const close = () => {
    setClosed(true);
    try {
      sessionStorage.setItem(KEY, a.title);
    } catch {
      // Private mode: it just shows again next time.
    }
  };

  const jump = () => {
    const tile = document.querySelector(".promo");
    if (!tile) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    tile.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
    // Restart the flash even if it's still running from the last click.
    tile.classList.remove("is-flash");
    void tile.offsetWidth;
    tile.classList.add("is-flash");
    tile.querySelector("a, button")?.focus({ preventScroll: true });
  };

  return (
    <AnimatePresence>
      {ready && !closed && !tileOnScreen && (
        <motion.aside
          className="next-toast"
          aria-label="Up next"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        >
          <button type="button" className="next-toast__main" onClick={jump}>
            <span className="next-toast__eyebrow mono">
              <span className="promo__pulse" aria-hidden="true" />
              {a.eyebrow || "Up next"}
            </span>
            <span className="next-toast__title display">{a.title}</span>
            <span className="next-toast__go mono">
              See details <span aria-hidden="true">→</span>
            </span>
          </button>
          <button type="button" className="next-toast__x" onClick={close} aria-label="Hide this">
            ✕
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
