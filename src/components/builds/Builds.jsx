import { useRef } from "react";
import { AnimatePresence } from "motion/react";
import { gsap, useGSAP, MOTION_OK } from "../../lib/gsap";
import { onAir, requests, shipped } from "../../data/projects";
import Pill from "../ui/Pill";
import SplitHeading from "../ui/SplitHeading";
import Desktop from "./Desktop";
import RequestModal from "./RequestModal";
import useRequestRoute, { requestHref } from "./useRequestRoute";
import "./Builds.css";

/* What the track is building and what it has shipped, on the PT-OS desktop,
   plus the way in for requests while they're open. */
export default function Builds() {
  const root = useRef(null);
  const request = useRequestRoute();
  const live = onAir();
  const done = shipped();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: ".builds__stage", start: "top 80%", once: true } });
        tl.fromTo(".monitor", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.4)" })
          // The screen wakes up: a bright line that opens up.
          .fromTo(".os", { scaleY: 0.02, filter: "brightness(4)" }, { scaleY: 1, filter: "brightness(1)", duration: 0.45, ease: "power3.out" }, 0.4);
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
            <p className="builds__lede">
              What we're making right now, on our own and with the club's other tracks. Click around: finished builds wait in the shipped
              folder.
            </p>
          </div>
        </div>

        <div className="builds__stage">
          <Desktop builds={live} shipped={done} />
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
      </div>

      <AnimatePresence>{request.open && <RequestModal key="request" onClose={request.close} />}</AnimatePresence>
    </section>
  );
}
