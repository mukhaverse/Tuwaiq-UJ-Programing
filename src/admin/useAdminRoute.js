import { useEffect, useState } from "react";

// One admin section per hash: #/members, #/journey, #/survey/people/x…
// Returns the part after "#/", or "" for none.
function read() {
  const h = window.location.hash;
  return h.startsWith("#/") ? h.slice(2) : "";
}

export default function useAdminRoute() {
  const [section, setSection] = useState(read);
  useEffect(() => {
    const sync = () => setSection(read());
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return section;
}
