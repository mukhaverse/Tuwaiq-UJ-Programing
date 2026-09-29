import { useEffect, useState } from "react";

// The admin panel lives at #admin, with one section per hash: #admin/members,
// #admin/journey… Returns the section, "" for plain #admin, or null on the public site.
function read() {
  const h = window.location.hash;
  if (h === "#admin") return "";
  return h.startsWith("#admin/") ? h.slice("#admin/".length) : null;
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
