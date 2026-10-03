import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { gsap, useGSAP, MOTION_OK } from "../../lib/gsap";
import { ago, getTrack, isCollab, kindOf, projects, requests } from "../../data/projects";
import { members, shortName } from "../../data/members";
import { color, inkOn } from "../../lib/palette";
import { memberHref } from "../members/useMemberRoute";
import Character from "../character/Character";
import SplitHeading from "../ui/SplitHeading";
import RequestModal from "./RequestModal";
import useRequestRoute, { requestHref } from "./useRequestRoute";
import "./Builds.css";

// Projects glow violet; collaborations take their track's colour. Mirrors --violet / --orange in tokens.css.
const VIOLET = "#a380ff";
const ORANGE = "#f4a664";

const hueVars = (hex) => ({ "--hue": hex, "--hue-ink": inkOn(hex) });

// Hovering a monitor makes its crew pop up further from behind it, one after another.
const peek = {
  rest: { y: 0 },
  hover: (i) => ({ y: -16, transition: { type: "spring", stiffness: 500, damping: 14, delay: i * 0.05 } }),
};

/* A monitor: bezel, screen, chin with a power light, and a stand. */
function Monitor({ hue, sticker, screen, chin, className = "" }) {
  return (
    <div className={`rig__monitor ${className}`} style={hueVars(hue)}>
      {sticker && <span className="rig__sticker mono">{sticker}</span>}
      <div className="rig__screen">{screen}</div>
      <div className="rig__chin">
        <span className="rig__brand mono">{chin}</span>
        <span className="rig__led" aria-hidden="true" />
      </div>
    </div>
  );
}

function Stand() {
  return (
    <div className="rig__stand" aria-hidden="true">
      <span className="rig__neck" />
      <span className="rig__base" />
    </div>
  );
}

function BuildMonitor({ project }) {
  const kind = kindOf(project.kind);
  // In roster order, so leads come first.
  const crew = members.filter((m) => project.members.includes(m.id));
  const track = isCollab(project) ? getTrack(project.trackId) : null;
  const sticker = track ? `collab × ${track.name}` : project.forLabel ? `project · for ${project.forLabel}` : "project";

  return (
    <motion.li className={`rig ${track ? "rig--collab" : "rig--project"}`} initial="rest" animate="rest" whileHover="hover">
      {crew.length > 0 && (
        <div className="rig__crew">
          {crew.map((m, i) => (
            <motion.a key={m.id} href={memberHref(m.id)} className="rig__mate" variants={peek} custom={i} aria-label={shortName(m)} title={shortName(m)}>
              <Character type={m.avatar.char} body={color(m.avatar.body)} className="sticker" />
            </motion.a>
          ))}
        </div>
      )}
      <Monitor
        hue={track?.color ?? VIOLET}
        sticker={sticker}
        chin={
          <>
            <span aria-hidden="true">{kind.glyph}</span> {kind.label}
          </>
        }
        screen={
          <>
            <p className="rig__status mono">
              <span>
                <span className="rig__dot" aria-hidden="true" /> building
              </span>
              <span className="rig__ago">{ago(project.updatedAt)}</span>
            </p>
            <h3 className="rig__title display">{project.title}</h3>
            {project.note && (
              <p className="rig__note">
                <span className="rig__prompt" aria-hidden="true">
                  &gt;
                </span>{" "}
                {project.note}
              </p>
            )}
            <span className="rig__load" aria-hidden="true" />
          </>
        }
      />
      <Stand />
    </motion.li>
  );
}

/* While requests are open: a monitor waiting for someone's idea. */
function AskMonitor() {
  return (
    <li className="rig rig--ask">
      <a href={requestHref} className="rig__link" aria-label="Request a build">
        <Monitor
          hue={ORANGE}
          sticker="open for requests"
          chin="Request a build →"
          screen={
            <>
              <span className="rig__plus" aria-hidden="true">
                +
              </span>
              <p className="rig__title display">Your idea here</p>
              <p className="rig__note">
                Your track needs a survey, a page, a bot?
                <br />
                <span className="rig__prompt">&gt;</span> plug it in
                <span className="cursor" aria-hidden="true" />
              </p>
            </>
          }
        />
        <Stand />
      </a>
    </li>
  );
}

/* Nothing in progress: the screen has no signal. */
function IdleMonitor() {
  return (
    <li className="rig rig--idle" aria-label="Nothing building right now">
      <Monitor
        hue="#9a93b3"
        chin="standby"
        screen={
          <div className="rig__nosignal">
            <p className="mono">No signal</p>
            <p className="rig__note">nothing on screen right now</p>
          </div>
        }
      />
      <Stand />
    </li>
  );
}

function summary(list) {
  const collabs = list.filter(isCollab).length;
  const own = list.length - collabs;
  const parts = [];
  if (collabs) parts.push(`${collabs} ${collabs === 1 ? "collab" : "collabs"} with other tracks`);
  if (own) parts.push(`${own} ${own === 1 ? "project" : "projects"} of our own`);
  return parts.join(" and ");
}

export default function Builds() {
  const root = useRef(null);
  const request = useRequestRoute();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // Monitors power on one after another: they drop in, then their screens flicker up.
        const tl = gsap.timeline({ scrollTrigger: { trigger: ".builds__grid", start: "top 82%", once: true } });
        gsap.utils.toArray(".rig").forEach((rig, i) => {
          tl.fromTo(rig, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.5)" }, i * 0.12).fromTo(
            rig.querySelector(".rig__screen"),
            { "--power": 0 },
            { "--power": 1, duration: 0.45, ease: "steps(5)" },
            i * 0.12 + 0.3
          );
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section className="section builds" id="builds" ref={root}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow mono">Projects &amp; collabs</p>
            <SplitHeading className="display">Builds</SplitHeading>
          </div>
          <p>
            {projects.length ? (
              <>
                On our screens right now: <strong>{summary(projects)}</strong>.
              </>
            ) : (
              "Nothing on our screens right now. Something's always about to be, though."
            )}
          </p>
        </div>

        <ul className="builds__grid">
          {projects.map((p) => (
            <BuildMonitor key={p.id} project={p} />
          ))}
          {!projects.length && <IdleMonitor />}
          {requests.open && <AskMonitor />}
        </ul>
      </div>

      <AnimatePresence>{request.open && <RequestModal key="request" onClose={request.close} />}</AnimatePresence>
    </section>
  );
}
