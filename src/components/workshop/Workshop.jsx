import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gsap, useGSAP, MOTION_OK } from "../../lib/gsap";
import { ago, kindOf, projects } from "../../data/projects";
import { members, shortName } from "../../data/members";
import { color } from "../../lib/palette";
import { memberHref } from "../members/useMemberRoute";
import Character from "../character/Character";
import SplitHeading from "../ui/SplitHeading";
import RequestModal from "./RequestModal";
import useRequestRoute, { requestHref } from "./useRequestRoute";
import "./Workshop.css";

// Hovering a card makes its crew hop, one after another.
const hop = {
  rest: { y: 0 },
  hover: (i) => ({ y: [0, -16, 0], transition: { duration: 0.42, delay: i * 0.07, ease: "easeOut" } }),
};

/* A project on the bench: the crew peeks over the top edge, the bar keeps building. */
function BuildCard({ project }) {
  const kind = kindOf(project.kind);
  // In roster order, so leads come first.
  const crew = members.filter((m) => project.members.includes(m.id));
  return (
    <motion.li className="build" initial="rest" animate="rest" whileHover="hover">
      {crew.length > 0 && (
        <div className="build__crew">
          {crew.map((m, i) => (
            <motion.a key={m.id} href={memberHref(m.id)} className="build__mate" variants={hop} custom={i} aria-label={shortName(m)} title={shortName(m)}>
              <Character type={m.avatar.char} body={color(m.avatar.body)} className="sticker" />
            </motion.a>
          ))}
        </div>
      )}
      <p className="build__meta mono">
        <span className="build__dot" aria-hidden="true" />
        Building
        <span className="build__for">· {project.track ? `for ${project.track}` : "in-house"}</span>
      </p>
      <h3 className="build__title display">{project.title}</h3>
      {project.note && (
        <p className="build__note">
          <span className="build__prompt" aria-hidden="true">
            &gt;
          </span>{" "}
          {project.note}
        </p>
      )}
      <div className="build__foot">
        <span className="tag build__kind">
          <span aria-hidden="true">{kind.glyph}</span> {kind.label}
        </span>
        <span className="build__ago mono">updated {ago(project.updatedAt)}</span>
      </div>
      <span className="build__bar" aria-hidden="true" />
    </motion.li>
  );
}

/* The last tile: always there, so other tracks always have a way in. */
function AskTile() {
  return (
    <li className="build build--ask">
      <a href={requestHref} className="ask">
        <span className="ask__plus" aria-hidden="true">
          +
        </span>
        <span className="ask__title display">Your idea here</span>
        <span className="ask__body">Your track needs a survey, a page, a bot? Tell us what to build.</span>
        <span className="ask__cta mono">Request a build →</span>
      </a>
    </li>
  );
}

export default function Workshop() {
  const root = useRef(null);
  const request = useRequestRoute();
  const count = projects.length;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          ".build",
          { autoAlpha: 0, y: 36, rotate: (i) => (i % 2 ? 2 : -2) },
          {
            autoAlpha: 1,
            y: 0,
            rotate: 0,
            duration: 0.7,
            ease: "back.out(1.6)",
            stagger: 0.1,
            scrollTrigger: { trigger: ".workshop__grid", start: "top 82%", once: true },
          }
        );
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section className="section workshop" id="workshop" ref={root}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow mono">Now building</p>
            <SplitHeading className="display">Workshop</SplitHeading>
          </div>
          <p>
            {count ? (
              <>
                <strong>{count}</strong> {count === 1 ? "project" : "projects"} on the bench right now, for the club and for us.
              </>
            ) : (
              "The bench is clear. Got something for us to build?"
            )}
          </p>
        </div>

        <ul className="workshop__grid">
          {projects.map((p) => (
            <BuildCard key={p.id} project={p} />
          ))}
          {!count && (
            <li className="build build--idle" aria-label="Nothing in progress">
              <p className="mono">$ ls ./workshop</p>
              <p className="build__idle mono">
                nothing here… yet
                <span className="cursor" aria-hidden="true" />
              </p>
            </li>
          )}
          <AskTile />
        </ul>
      </div>

      <AnimatePresence>{request.open && <RequestModal key="request" onClose={request.close} />}</AnimatePresence>
    </section>
  );
}
