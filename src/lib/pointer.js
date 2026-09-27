import { motionValue } from "motion/react";

// One shared pointer position for the whole page, so every cartoon eye
// can watch the cursor without each attaching its own listener.
export const pointer = {
  x: motionValue(typeof window === "undefined" ? 0 : window.innerWidth / 2),
  y: motionValue(typeof window === "undefined" ? 0 : window.innerHeight / 3),
};

if (typeof window !== "undefined") {
  window.addEventListener(
    "pointermove",
    (e) => {
      pointer.x.set(e.clientX);
      pointer.y.set(e.clientY);
    },
    { passive: true }
  );
}
