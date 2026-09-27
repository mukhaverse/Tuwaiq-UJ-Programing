import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { ScrollTrigger } from "./lib/gsap";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Hero from "./components/intro/Hero";
import Members from "./components/members/Members";
import Playground from "./components/playground/Playground";
import Journey from "./components/journey/Journey";

// Page sections, top to bottom. New sections go here.
export default function App() {
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
      <Header />
      <main>
        <Hero />
        <Members />
        <Playground />
        <Journey />
      </main>
      <Footer />
    </MotionConfig>
  );
}
