import { useRef } from "react";
import { motion } from "motion/react";
import { gsap, SplitText, useGSAP, MOTION_OK } from "../../lib/gsap";
import { track } from "../../data/track";
import { members } from "../../data/members";
import { milestones } from "../../data/milestones";
import Character from "../character/Character";
import Mountain from "../brand/Mountain";
import Pill from "../ui/Pill";
import Leaders from "./Leaders";
import { memberHref } from "../members/useMemberRoute";
import { color } from "../../lib/palette";
import { CELLS, assemblyTime } from "../../lib/mountain";
import "./Hero.css";

// The title's last word is highlighted, like the "INIT" in TUWAIQ INIT.
function splitTitle(name) {
  const words = name.split(" ");
  const tail = words.pop();
  return [words.join(" "), tail];
}

const pad = (n) => String(n).padStart(2, "0");

// ---------- The climb: the crew perched on the Commit Mountain ----------

const MOUNTAIN_STEP = 0.03;
const MOUNTAIN_DELAY = 0.3;
const SUMMIT_COL = 8;

// The top cell of every column except the summit, left to right.
const perches = [...new Set(CELLS.map(([c]) => c))]
  .filter((c) => c !== SUMMIT_COL)
  .sort((a, b) => a - b)
  .map((c) => ({ c, r: Math.min(...CELLS.filter(([cc]) => cc === c).map(([, r]) => r)) }));

// Who stands on the mountain, and where: the first few on the roster, each on
// the step of the mountain column listed here (0–14, the summit is 8). The
// leader is up the left slope, the co-leader one step below her, and the next
// member across on the right slope so the mountain isn't lopsided.
const SPOTS = [6, 5, 11];
const getClimbers = () =>
  members.slice(0, SPOTS.length).map((m, i) => ({
    member: m,
    ...perches.find((p) => p.c === SPOTS[i]),
    lead: i === 0,
  }));


// Cell coordinates → % of the 150 × 70 mountain box.
const leftOf = (c) => `${((c * 10 + 5) / 150) * 100}%`;
const bottomOf = (r) => `${((70 - (r * 10 + 1)) / 70) * 100}%`;

// The President and Vice President stand on the mountain's two end blocks,
// nudged inward (`at`, in columns) so they don't hang off its sides. Both stay
// on the bottom row, so they still stand on a block.
const LEADER_SPOTS = [
  { col: 0, at: 0.6 },
  { col: 14, at: 13.4 },
];
const leaderSpots = () =>
  LEADER_SPOTS.map(({ col, at }) => ({ left: leftOf(at), bottom: bottomOf(perches.find((p) => p.c === col).r) }));

function Climb() {
  const land = MOUNTAIN_DELAY + assemblyTime(MOUNTAIN_STEP);
  const climbers = getClimbers();
  return (
    <div className="climb">
      <div className="climb__peak">
        <Mountain assemble delay={MOUNTAIN_DELAY} step={MOUNTAIN_STEP} />
        {climbers.map(({ member, c, r, lead }, i) => (
          <motion.a
            key={member.id}
            href={memberHref(member.id)}
            className={`climb__char ${lead ? "climb__char--lead" : ""}`}
            style={{ left: leftOf(c), bottom: bottomOf(r) }}
            aria-label={`${member.name}'s profile`}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 16, delay: land + i * 0.08 }}
            whileHover={{ y: -8 }}
          >
            <Character type={member.avatar.char} body={color(member.avatar.body)} blink={i * 0.7} className="sticker" />
          </motion.a>
        ))}
        <Leaders
          spots={leaderSpots()}
          delay={land + climbers.length * 0.08 + 0.45}
        />
        <motion.span
          className="climb__goal mono"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: land + 0.2 }}
        >
          {milestones.every((m) => m.done) ? "✓ summit reached" : "← summit"}
        </motion.span>
      </div>
    </div>
  );
}

export default function Hero() {
  const root = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const split = SplitText.create(".hero__title", { type: "words,chars", mask: "words" });
        gsap
          .timeline({ defaults: { ease: "power4.out" }, delay: 0.1 })
          .fromTo(split.chars, { yPercent: 110 }, { yPercent: 0, duration: 1, stagger: 0.03 })
          .fromTo(
            [".hero__meta", ".hero__cta"],
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08 },
            "-=0.8"
          );

        // The shell session types itself out: each command letter by letter,
        // then its output lands line by line, like a real terminal.
        const typing = gsap.timeline({ delay: 0.5 });
        typing.fromTo(".sh__path", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
        gsap.utils.toArray(".sh__block").forEach((block) => {
          const chars = SplitText.create(block.querySelector(".sh__cmd"), { type: "chars" }).chars;
          typing
            .fromTo(block.querySelector(".sh__prompt"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, "+=0.2")
            .fromTo(chars, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, stagger: 0.035, ease: "none" }, "+=0.15")
            .fromTo(
              block.querySelectorAll(".sh__out > *"),
              { autoAlpha: 0, y: 4 },
              { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.04, ease: "power2.out" },
              "+=0.1"
            );
        });
        typing.fromTo(".sh__idle", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, "+=0.2");
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  const done = milestones.filter((m) => m.done).length;
  const [titleHead, titleTail] = splitTitle(track.name);

  /* A stage: the mountain in the middle with the title rising behind it, and
     everything else pinned to the corners around it. */
  return (
    <section className="hero" id="top" ref={root}>
      <div className="wrap hero__stage">
        <div className="hero__meta mono">
          <p className="hero__semester">{track.semester}</p>
          <dl className="hero__stats">
            <div>
              <dt>Members</dt>
              <dd>{pad(members.length)}</dd>
            </div>
            <div>
              <dt>Milestones done</dt>
              <dd>{pad(done)}</dd>
            </div>
          </dl>
        </div>

        <h1 className="hero__title display">
          {titleHead} <br />
          <span className="hero__title-hl">{titleTail}</span>
        </h1>

        <Climb />

        {/* A bare shell session: no window chrome, just the prompt and its output. */}
        <div className="sh hero__about" aria-label="About this site">
          <p className="sh__path">
            <span className="sh__dir">~/programming-track</span> <span className="sh__branch">git:(main)</span>
          </p>
          <div className="sh__block">
            <p className="sh__line">
              <span className="sh__prompt" aria-hidden="true">❯</span> <span className="sh__cmd">whatis this-site</span>
            </p>
            <div className="sh__out">
              <p className="sh__about">{track.intro}</p>
            </div>
          </div>
          <p className="sh__line sh__idle">
            <span className="sh__prompt" aria-hidden="true">❯</span>
            <span className="cursor" aria-hidden="true" />
          </p>
        </div>

        <div className="hero__cta">
          <div className="hero__pills">
            <Pill href="#members" variant="accent">
              Meet the {members.length} members
            </Pill>
            <Pill href="#journey">The journey</Pill>
          </div>
        </div>
      </div>
    </section>
  );
}
