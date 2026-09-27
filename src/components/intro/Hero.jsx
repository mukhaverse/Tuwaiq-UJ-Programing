import { useRef } from "react";
import { gsap, SplitText, useGSAP, MOTION_OK } from "../../lib/gsap";
import { track } from "../../data/track";
import { members } from "../../data/members";
import { milestones } from "../../data/milestones";
import { badges } from "../../data/badges";
import Character from "../character/Character";
import { memberHref } from "../members/useMemberRoute";
import { color } from "../../lib/palette";
import "./Hero.css";

const PREVIEW = 5;

// A short, stable, git-looking hash for a milestone id.
function shortHash(str) {
  let h = 5381;
  for (const ch of str) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return h.toString(16).padStart(7, "0").slice(0, 7);
}

const handle = (m) => m.name.split(" ")[0].toLowerCase();

// Completed milestones, newest first, as `git log --oneline` entries.
const commits = milestones
  .filter((m) => m.done)
  .reverse()
  .map((m) => {
    const badge = badges.find((b) => b.milestone === m.id);
    const earned = badge ? members.filter((mem) => mem.badges.includes(badge.id)).length : 0;
    return { id: m.id, hash: shortHash(m.id), msg: m.title.toLowerCase(), earned };
  });

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
            [".hero__eyebrow", ".hero__intro", ".hero__meet"],
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08 },
            "-=0.6"
          )
          .fromTo(".hero__face", { scale: 0 }, { scale: 1, duration: 0.5, ease: "back.out(1.4)", stagger: 0.06 }, "-=0.4");

        // The shell session types itself out: each command letter by letter,
        // then its output lands line by line, like a real terminal.
        const typing = gsap.timeline({ delay: 0.6 });
        typing.fromTo(".sh__path", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
        gsap.utils.toArray(".sh__block").forEach((block) => {
          const chars = SplitText.create(block.querySelector(".sh__cmd"), { type: "chars" }).chars;
          typing
            .fromTo(block.querySelector(".sh__prompt"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, "+=0.25")
            .fromTo(chars, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, stagger: 0.045, ease: "none" }, "+=0.2")
            .fromTo(
              block.querySelectorAll(".sh__out > *"),
              { autoAlpha: 0, y: 4 },
              { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.04, ease: "power2.out" },
              "+=0.15"
            );
        });
        typing.fromTo(".sh__idle", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, "+=0.2");
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section className="hero" id="top" ref={root}>
      <div className="wrap hero__inner">
        <div className="hero__head">
          <p className="hero__eyebrow eyebrow mono">
            {track.club} · {track.semester}
          </p>
          <h1 className="hero__title display">{track.name}</h1>
        </div>

        <div className="hero__text">
          <p className="hero__intro">{track.intro}</p>

          <a href="#members" className="hero__meet">
            <span className="hero__faces" aria-hidden="true">
              {members.slice(0, PREVIEW).map((m, i) => (
                <span className="hero__face" key={m.id}>
                  <Character type={m.avatar.char} body={color(m.avatar.body)} blink={i * 0.8} />
                </span>
              ))}
            </span>
            <span className="mono">Meet the {members.length} members →</span>
          </a>
        </div>

        {/* A bare shell session: no window chrome, just the prompt and its output. */}
        <div className="sh" aria-label="Track overview">
          <p className="sh__path">
            <span className="sh__dir">~/se-club/programming-track</span> <span className="sh__branch">git:(main)</span>
          </p>

          <div className="sh__block">
            <p className="sh__line">
              <span className="sh__prompt" aria-hidden="true">❯</span> <span className="sh__cmd">ls members/</span>
            </p>
            <ul className="sh__out sh__ls">
              {members.map((m) => (
                <li key={m.id}>
                  <a href={memberHref(m.id)} className="sh__entry" aria-label={`${m.name}'s profile`}>
                    {handle(m)}/
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="sh__block">
            <p className="sh__line">
              <span className="sh__prompt" aria-hidden="true">❯</span> <span className="sh__cmd">git log --oneline</span>
            </p>
            <ol className="sh__out sh__log">
              {commits.map((c, i) => (
                <li key={c.id}>
                  <span className="sh__hash">{c.hash}</span>
                  {i === 0 && <span className="sh__head"> (HEAD → main)</span>} {c.msg}
                  {c.earned > 0 && <span className="sh__note"> · {c.earned} badges earned</span>}
                </li>
              ))}
              <li className="sh__note">
                # {commits.length}/{milestones.length} milestones this semester
              </li>
            </ol>
          </div>

          <p className="sh__line sh__idle">
            <span className="sh__prompt" aria-hidden="true">❯</span>
            <span className="cursor" aria-hidden="true" />
          </p>
        </div>
      </div>
    </section>
  );
}
