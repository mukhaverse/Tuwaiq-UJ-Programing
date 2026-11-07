// Opens the portfolio pages (#portfolio…) over the site, full screen. Their code is a
// separate chunk, downloaded only when someone opens them.
import { lazy, Suspense, useEffect, useState } from "react";

const PortfolioApp = lazy(() => import("../../portfolio/PortfolioApp"));

const read = () => {
  const h = window.location.hash;
  return h === "#portfolio" || h.startsWith("#portfolio/") ? h.slice("#portfolio".length + 1) : null;
};

function usePortfolioPath() {
  const [path, setPath] = useState(read);
  useEffect(() => {
    const sync = () => setPath(read());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return path;
}

export default function PortfolioRoute() {
  const path = usePortfolioPath();
  const open = path !== null;

  // The site underneath holds still while the portfolio pages are open.
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("is-locked");
    return () => document.body.classList.remove("is-locked");
  }, [open]);

  if (!open) return null;
  return (
    <div className="pf-layer">
      <Suspense fallback={<p className="pf-layer__loading mono">Loading…</p>}>
        <PortfolioApp path={path} />
      </Suspense>
    </div>
  );
}
