import { useRef } from "react";
import { gsap, useGSAP, MOTION_OK } from "../../lib/gsap";
import { milestones, milestoneStatus, LOCKED_SHOWN } from "../../data/milestones";
import { badges } from "../../data/badges";
import { members } from "../../data/members";
import { track } from "../../data/track";
import { BadgeMark } from "../badges/Badge";
import SplitHeading from "../ui/SplitHeading";
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

  useGSAP(
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
                <li className="ms ms--locked" key={m.id} aria-label="Locked milestone">
                  <div className="ms__rail" aria-hidden="true">
                    <span className="ms__node">
                      <Lock />
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
            return (
              <li className={`ms ms--${status}`} key={m.id}>
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
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
