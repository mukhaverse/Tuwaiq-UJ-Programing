import { useRef } from "react";
import { AnimatePresence } from "motion/react";
import { gsap, useGSAP, MOTION_OK } from "../../lib/gsap";
import { isCollab, onAir, requests, shipped } from "../../data/projects";
import Pill from "../ui/Pill";
import SplitHeading from "../ui/SplitHeading";
import Drawer from "./Drawer";
import OnAir from "./OnAir";
import RequestModal from "./RequestModal";
import useRequestRoute, { requestHref } from "./useRequestRoute";
import "./Builds.css";

/* What the track is building (counted and listed, one at a time on the monitor)
   and what it has shipped (folders in the drawer), plus the way in for requests
   while they're open. */
export default function Builds() {
  const root = useRef(null);
  const request = useRequestRoute();
  const live = onAir();
  const done = shipped();
  const collabs = live.filter(isCollab).length;
  const own = live.length - collabs;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: ".builds__stage", start: "top 80%", once: true } });
        tl.fromTo(".monitor", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.4)" })
          .fromTo(".guide__chip", { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.05 }, 0.2)
          // The screen wakes up: a bright line that opens up.
          .fromTo(".monitor__picture", { scaleY: 0.02, filter: "brightness(4)" }, { scaleY: 1, filter: "brightness(1)", duration: 0.45, ease: "power3.out" }, 0.45)
          .fromTo(".cabinet", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.4)" }, 0.15)
          // Folders get filed in, front ones last.
          .fromTo(".folder", { y: -60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "bounce.out", stagger: 0.08 }, 0.5);
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
            {live.length || done.length ? (
              <>
                Building now: <strong>{collabs}</strong> {collabs === 1 ? "collab" : "collabs"} and <strong>{own}</strong>{" "}
                {own === 1 ? "project" : "projects"}. Shipped so far: <strong>{done.length}</strong>.
              </>
            ) : (
              "Nothing being built and nothing shipped, yet. Stay tuned."
            )}
          </p>
        </div>

        <div className="builds__stage">
          <div className="builds__col">
            <p className="builds__label mono">Building now · {String(live.length).padStart(2, "0")}</p>
            <OnAir builds={live} />
            {requests.open && (
              <div className="builds__ask">
                <p>
                  <strong>Requests are open.</strong> Does your track need something built?
                </p>
                <Pill href={requestHref} variant="accent">
                  Request a build
                </Pill>
              </div>
            )}
          </div>
          <div className="builds__col">
            <p className="builds__label mono">Shipped · {String(done.length).padStart(2, "0")}</p>
            <Drawer builds={done} />
          </div>
        </div>
      </div>

      <AnimatePresence>{request.open && <RequestModal key="request" onClose={request.close} />}</AnimatePresence>
    </section>
  );
}
