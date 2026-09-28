import { useEffect } from "react";
import { motion } from "motion/react";
import Mountain, { Lockup } from "../brand/Mountain";
import { assemblyTime } from "../../lib/mountain";
import { members } from "../../data/members";
import { track } from "../../data/track";
import "./Splash.css";

// Timeline, in seconds from the moment the splash mounts.
const T = {
  cmd1: 0.45,
  out: 1.0,
  cmd2: 1.55,
  mountain: 2.3,
};
const STEP = 0.04;
T.lockup = T.mountain + assemblyTime(STEP);
T.ready = T.lockup + 0.3;
T.done = T.ready + 0.9;

const show = (at) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.01, delay: at },
});

/* A command typed out letter by letter. */
function Typed({ text, at }) {
  return [...text].map((ch, i) => (
    <motion.span key={i} {...show(at + i * 0.028)}>
      {ch}
    </motion.span>
  ));
}

function Cmd({ text, at }) {
  return (
    <p className="splash__line">
      <motion.span className="splash__prompt" {...show(at - 0.15)}>
        ❯
      </motion.span>{" "}
      <Typed text={text} at={at} />
    </p>
  );
}

const checks = [
  ["club", track.club.toLowerCase()],
  ["track", "programming"],
  ["members", `${members.length} loaded`],
];

/* Boot screen: a terminal opens, initialises the track, and `git log --graph`
   draws the Commit Mountain. Once it's done (or on any key / tap) the mountain
   flies up into the header, where the header's mark shares its layoutId. */
export default function Splash({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, T.done * 1000);
    const skip = () => onDone();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [onDone]);

  return (
    <motion.div
      className="splash"
      role="status"
      aria-label={`Loading ${track.name}`}
      exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.1 } }}
    >
      <motion.div
        className="splash__term"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.3 } }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <div className="splash__body" aria-hidden="true">
          <motion.p className="splash__line splash__path" {...show(0.15)}>
            tuwaiq@uj <span className="splash__dir">~/programming-track</span>
          </motion.p>
          <Cmd text="tuwaiq.init()" at={T.cmd1} />
          {checks.map(([key, value], i) => (
            <motion.p key={key} className="splash__line splash__out" {...show(T.out + i * 0.14)}>
              <span className="splash__ok">✓</span> <span className="splash__key">{key.padEnd(8)}</span>
              {value}
            </motion.p>
          ))}
          <Cmd text="git log --graph --mountain" at={T.cmd2} />

          <motion.div layoutId="brand-mountain" className="splash__mountain">
            <Mountain assemble delay={T.mountain} step={STEP} />
          </motion.div>

          <motion.div
            className="splash__lockup"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: T.lockup }}
          >
            <Lockup />
          </motion.div>

          <motion.p className="splash__line splash__ready" {...show(T.ready)}>
            <span className="splash__ok">✓</span> ready · {track.tagline.toLowerCase()}
            <span className="cursor" />
          </motion.p>
        </div>
      </motion.div>

      <motion.p className="splash__skip mono" {...show(0.8)}>
        press any key to skip
      </motion.p>
    </motion.div>
  );
}
