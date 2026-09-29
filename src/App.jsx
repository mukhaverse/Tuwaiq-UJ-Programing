import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig } from "motion/react";
import { ScrollTrigger } from "./lib/gsap";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Splash from "./components/splash/Splash";
import Hero from "./components/intro/Hero";
import Members from "./components/members/Members";
import Playground from "./components/playground/Playground";
import Journey from "./components/journey/Journey";

const BOOTED_KEY = "pt:booted";

// The boot splash plays once per browser session. It's skipped for deep links
// (#members, #member/<id>) and for people who prefer reduced motion.
function needsSplash() {
  if (window.location.hash) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    return !sessionStorage.getItem(BOOTED_KEY);
  } catch {
    return true;
  }
}

// Page sections, top to bottom. New sections go here.
export default function App() {
  const [booted, setBooted] = useState(() => !needsSplash());

  const finishBoot = useCallback(() => {
    try {
      sessionStorage.setItem(BOOTED_KEY, "1");
    } catch {
      // Private mode etc. — the splash just plays again next visit.
    }
    setBooted(true);
  }, []);

  // Hold the page at the top while the splash plays.
  useEffect(() => {
    if (booted) return;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.body.classList.add("is-locked");
    return () => document.body.classList.remove("is-locked");
  }, [booted]);

  // Trigger positions go stale whenever the page height changes without a resize
  // (web fonts landing, the member filter shrinking the grid), so re-measure then.
  useEffect(() => {
    let lastHeight = document.body.scrollHeight;
    let timer;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const h = document.body.scrollHeight;
        if (h !== lastHeight) {
          lastHeight = h;
          ScrollTrigger.refresh();
        }
      }, 250);
    });
    ro.observe(document.body);
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup>
        <Header booting={!booted} />
        <AnimatePresence>{!booted && <Splash key="splash" onDone={finishBoot} />}</AnimatePresence>
        {/* The page mounts as the splash leaves, so the hero's intro plays on cue. */}
        {booted && (
          <>
            <main>
              <Hero />
              <Members />
              <Journey />
              <Playground />
            </main>
            <Footer />
          </>
        )}
      </LayoutGroup>
    </MotionConfig>
  );
}
