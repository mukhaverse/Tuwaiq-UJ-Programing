import { useCallback, useEffect, useRef, useState } from "react";

// The request form lives at #request, so it has a link to send to other tracks
// and the browser Back button closes it.
const HASH = "#request";
export const requestHref = HASH;

const read = () => window.location.hash === HASH;

export default function useRequestRoute() {
  const [open, setOpen] = useState(read);
  // True when it was opened from a link on the page (so there's a history entry to step back over).
  const cameIn = useRef(false);

  useEffect(() => {
    const sync = () => {
      const now = read();
      if (now) cameIn.current = true;
      setOpen(now);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const close = useCallback(() => {
    if (cameIn.current) {
      cameIn.current = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setOpen(false);
    }
  }, []);

  return { open, close };
}
