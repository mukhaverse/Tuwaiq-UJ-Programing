import { useCallback, useEffect, useRef, useState } from "react";

// Keeps the open profile in the URL (#member/<id>) so every member card
// has a link that can be shared, and the browser Back button closes it.
const PREFIX = "#member/";

function readHash() {
  const h = window.location.hash;
  return h.startsWith(PREFIX) ? decodeURIComponent(h.slice(PREFIX.length)) : null;
}

export function memberHref(id) {
  return PREFIX + encodeURIComponent(id);
}

export default function useMemberRoute() {
  const [id, setId] = useState(readHash);
  const pushed = useRef(false);

  useEffect(() => {
    const sync = () => {
      pushed.current = false;
      setId(readHash());
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const open = useCallback((next) => {
    window.history.pushState(null, "", memberHref(next));
    pushed.current = true;
    setId(next);
  }, []);

  const close = useCallback(() => {
    if (pushed.current) {
      // We added the history entry, so stepping back removes it (and fires popstate).
      window.history.back();
    } else {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setId(null);
    }
  }, []);

  return { id, open, close };
}
