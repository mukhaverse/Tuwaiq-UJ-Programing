import { useRef, useState } from "react";
import { gsap, useGSAP, MOTION_OK } from "../../lib/gsap";
import { milestones, milestoneStatus, LOCKED_SHOWN } from "../../data/milestones";
import { badges } from "../../data/badges";
import { members } from "../../data/members";
import { track } from "../../data/track";
import { BadgeMark } from "../badges/Badge";
import SplitHeading from "../ui/SplitHeading";
import Memories from "./Memories";
import { devPhotos } from "./devPhotos";
import "./Journey.css";

const LABEL = { done: "Done", next: "Up next", locked: "Locked" };

// Done milestones, "up next", then a couple of locked steps; the rest aren't rendered at all.
// Until the semester is over, the trail fades out after the last step instead of ending.
function visibleSteps() {
  const nextIndex = milestones.findIndex((m) => !m.done);
  const shown = nextIndex === -1 ? milestones : milestones.slice(0, nextIndex + 1 + LOCKED_SHOWN);
  return { shown, openEnded: nextIndex !== -1 };
}

// How much of the connector to the next milestone is filled in.
function fillTo(shown, i) {
  if (i === shown.length - 1) return 0;
  if (shown[i + 1].done) return 1;
  return shown[i].done ? 0.5 : 0;
}

// A milestone's photos. In `npm run dev`, done milestones without any get stand-ins.
function photosOf(m) {
  if (m.photos?.length) return m.photos;
  return import.meta.env.DEV && m.done ? devPhotos() : [];
}

function earnedCount(badgeId) {
  return members.filter((m) => m.badges.includes(badgeId)).length;
}

/* A small pixel padlock. */
function Lock() {
  return (
    <svg viewBox="0 0 10 12" className="ms__lock" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M3 1h4v1H3zM2 2h1v3H2zM7 2h1v3H7zM1 5h8v6H1z" />
      <path d="M4 7h2v2H4z" className="ms__keyhole" />
    </svg>
  );
}

export default function Journey() {
  const root = useRef(null);
  const done = milestones.filter((m) => m.done).length;
  const { shown, openEnded } = visibleSteps();
  // The milestone whose memories are open, and the node they came out of.
  const [open, setOpen] = useState(null);
  const opener = useRef(null);

  const { contextSafe } = useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: { trigger: ".journey__list", start: "top 80%", once: true },
        });
        gsap.utils.toArray(".ms").forEach((item, i) => {
          const at = i * 0.28;
          tl.fromTo(
            item.querySelector(".ms__node"),
            { scale: 0 },
            { scale: 1, duration: 0.5, ease: "back.out(2.5)" },
            at
          ).fromTo(
            item.querySelector(".ms__text"),
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.5 },
            at + 0.05
          );
          const fill = item.querySelector(".ms__fill");
          if (fill) {
            tl.fromTo(fill, { "--p": 0 }, { "--p": Number(fill.dataset.to), duration: 0.5, ease: "power2.inOut" }, at + 0.2);
          }
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  /* The node presses in like a shutter button, then the memories open. */
  // Tweens started from event handlers, kept in the section's GSAP context.
  const tween = (fn) => contextSafe(fn)();

  const openMemories = (m, li, button) => {
    const node = li.querySelector(".ms__node");
    opener.current = button ?? li.querySelector(".ms__open");
    tween(() => gsap.fromTo(node, { scale: 1 }, { scale: 0.78, duration: 0.09, yoyo: true, repeat: 1, ease: "power2.in" }));
    setOpen({ milestone: m, node });
  };

  const closeMemories = () => {
    const node = open?.node;
    setOpen(null);
    opener.current?.focus({ preventScroll: true });
    // The node swallows the photos back with a little gulp.
    if (node) tween(() => gsap.fromTo(node, { scale: 1.25 }, { scale: 1, duration: 0.6, ease: "elastic.out(1.1, 0.4)" }));
  };

  /* Locked: the padlock rattles, and says so. */
  const rattle = (li) =>
    tween(() => {
    gsap.fromTo(li.querySelector(".ms__lock"), { rotation: 0 }, { keyframes: { rotation: [0, -18, 15, -11, 8, -4, 0] }, duration: 0.5, ease: "none", overwrite: true });
    const tip = li.querySelector(".ms__peek");
    gsap.killTweensOf(tip);
    gsap
      .timeline()
      .fromTo(tip, { autoAlpha: 0, y: 6, scale: 0.8 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(3)" })
      .to(tip, { autoAlpha: 0, y: -6, duration: 0.3 }, "+=1.1");
    });

  const status = open && milestoneStatus(milestones.indexOf(open.milestone));
  const openPhotos = open ? photosOf(open.milestone) : [];

  return (
    <section className="section journey" id="journey" ref={root}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <p className="eyebrow mono">{track.semester}</p>
            <SplitHeading className="display">Journey</SplitHeading>
          </div>
          <p>
            Where the track is this semester: <strong>{done}</strong> {done === 1 ? "milestone" : "milestones"} done.
          </p>
        </div>

        <ol className="journey__list">
          {shown.map((m, i) => {
            const status = milestoneStatus(i);
            const last = i === shown.length - 1;
            const trail = last && openEnded;
            const to = fillTo(shown, i);

            if (status === "locked") {
              return (
                <li className="ms ms--locked" key={m.id} aria-label="Locked milestone" onClick={(e) => rattle(e.currentTarget)}>
                  <div className="ms__rail" aria-hidden="true">
                    <span className="ms__node">
                      <Lock />
                      <span className="ms__peek mono">no peeking!</span>
                    </span>
                    {(!last || trail) && <span className={`ms__seg ${trail ? "ms__seg--trail" : ""}`} />}
                  </div>
                  <div className="ms__text" aria-hidden="true">
                    <p className="ms__when mono">
                      Week ?? · <span className="ms__status">{LABEL.locked}</span>
                    </p>
                    <span className="ms__redact" />
                    <span className="ms__redact ms__redact--short" />
                  </div>
                </li>
              );
            }

            const reward = badges.find((b) => b.milestone === m.id);
            const count = photosOf(m).length;
            return (
              <li
                className={`ms ms--${status} ms--openable`}
                key={m.id}
                // The whole step opens it for a mouse; the button below is the keyboard way in.
                onClick={(e) => !e.target.closest("button") && openMemories(m, e.currentTarget)}
              >
                <div className="ms__rail" aria-hidden="true">
                  <span className="ms__node">{status === "done" ? "✓" : String(i + 1).padStart(2, "0")}</span>
                  {(!last || trail) && (
                    <span className={`ms__seg ${trail ? "ms__seg--trail" : ""}`}>
                      {!trail && <span className="ms__fill" data-to={to} style={{ "--p": to }} />}
                    </span>
                  )}
                </div>
                <div className="ms__text">
                  <p className="ms__when mono">
                    {m.when} · <span className="ms__status">{LABEL[status]}</span>
                  </p>
                  <h3 className="ms__title">{m.title}</h3>
                  <p className="ms__note">{m.note}</p>
                  {reward && (
                    <p className="ms__reward">
                      <BadgeMark badge={reward} size="1.7rem" />
                      <span>
                        <strong>{reward.name}</strong> badge
                        {m.done && ` · ${earnedCount(reward.id)} earned`}
                      </span>
                    </p>
                  )}
                  <button type="button" className="ms__open mono" onClick={(e) => openMemories(m, e.currentTarget.closest("li"), e.currentTarget)}>
                    <span aria-hidden="true">▸</span>{" "}
                    {status === "next" ? "not developed yet" : count ? `${count} ${count === 1 ? "photo" : "photos"}` : "memories"}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {open && (
        <Memories
          key={open.milestone.id}
          milestone={open.milestone}
          origin={open.node}
          mode={openPhotos.length ? "photos" : "blank"}
          photos={openPhotos.length ? openPhotos : [{ url: null, caption: "" }]}
          caption={status === "next" ? "not developed yet…" : "no photos yet"}
          note={status === "next" ? open.milestone.when : "the film's still in the camera"}
          badge={status === "done" ? badges.find((b) => b.milestone === open.milestone.id) : null}
          onClose={closeMemories}
        />
      )}
    </section>
  );
}
