import { useRef } from "react";
import { gsap, SplitText, useGSAP, MOTION_OK } from "../../lib/gsap";

/* Heading whose letters pop up out of word-shaped masks when scrolled into view. */
export default function SplitHeading({ as: Tag = "h2", className = "", children, ...rest }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        SplitText.create(ref.current, {
          type: "words,chars",
          mask: "words",
          onSplit(self) {
            return gsap.fromTo(self.chars, { yPercent: 115 }, {
              yPercent: 0,
              duration: 0.9,
              ease: "power4.out",
              stagger: 0.028,
              scrollTrigger: {
                trigger: ref.current,
                start: "top 85%",
                toggleActions: "play none none reverse",
              },
            });
          },
        });
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
