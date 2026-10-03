import { useRef } from "react";
import { AnimatePresence } from "motion/react";
import { gsap, useGSAP, MOTION_OK } from "../../lib/gsap";
import { onAir, requests, shipped } from "../../data/projects";
import Pill from "../ui/Pill";
import SplitHeading from "../ui/SplitHeading";
import Drawer from "./Drawer";
import RequestModal from "./RequestModal";
import Tv from "./Tv";
import useRequestRoute, { requestHref } from "./useRequestRoute";
import "./Builds.css";

/* What the track is building (on the TV, one channel each) and what it has
   shipped (folders in the drawer), plus the way in for requests while they're open. */
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
        tl.fromTo(".tv", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.4)" })
          // The picture switches on like a CRT: a bright line that opens up.
          .fromTo(".tv__picture", { scaleY: 0.02, filter: "brightness(4)" }, { scaleY: 1, filter: "brightness(1)", duration: 0.45, ease: "power3.out" }, 0.45)
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
                <strong>{live.length}</strong> on air, <strong>{done.length}</strong> shipped. Flip through the channels, or pull a folder out of
                the drawer.
              </>
            ) : (
              "Nothing on air and nothing shipped, yet. Stay tuned."
            )}
          </p>
        </div>

        <div className="builds__stage">
          <div className="builds__col builds__col--tv">
            <p className="builds__label mono">On air</p>
            <Tv builds={live} />
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
            <p className="builds__label mono">Shipped</p>
            <Drawer builds={done} />
          </div>
        </div>
      </div>

      <AnimatePresence>{request.open && <RequestModal key="request" onClose={request.close} />}</AnimatePresence>
    </section>
  );
}
