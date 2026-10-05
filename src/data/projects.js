// What the track is building, loaded from the database at startup (see content.js).
// Only public fields reach the site; who asked and how to reach them stay in the
// admin panel. Two kinds of build:
//
//   collaboration  for another track (trackId set): shown in that track's colour
//   project        the track's own work, for anyone or no one in particular
//
// Each one:
//   id         number, also its ticket number (see ticket())
//   title      short name
//   trackId    the track it's a collaboration with (undefined for projects)
//   forLabel   projects only, optional: who it's for, e.g. "the whole club"
//   kind       optional: one of KINDS below
//   status     "in_progress" (on the monitor) or "done" (in the shipped folder)
//   summary    one short sentence on what it is
//   note       one public line about where it's at
//   updatedAt  "YYYY-MM-DD HH:MM:SS", UTC
//   finishedAt same format, for done ones: when it was marked done
//   members    ids of the members working on it
export let projects = [];

export function setProjects(list) {
  projects = list;
}

/** In progress, most recently updated first: what the monitor shows. */
export const onAir = () => projects.filter((p) => p.status === "in_progress");

/** Done, most recently finished first: what's in the shipped folder. */
export const shipped = () =>
  projects.filter((p) => p.status === "done").sort((a, b) => (b.finishedAt ?? b.updatedAt).localeCompare(a.finishedAt ?? a.updatedAt));

// The club's other tracks: { id, name, color: "#rrggbb" }, edited in the admin panel.
export let tracks = [];

export function setTracks(list) {
  tracks = list;
}

export function getTrack(id) {
  return tracks.find((t) => t.id === id);
}

export const isCollab = (project) => Boolean(project.trackId && getTrack(project.trackId));

// Whether visitors can send requests right now (admins switch it in the panel).
export let requests = { open: false };

export function setRequests(value) {
  requests = value ?? { open: false };
}

// What kind of thing a build is. Optional everywhere: leave it out and nothing
// is shown. A new kind is one line here (the API accepts any id).
export const KINDS = [
  { id: "survey", label: "Survey / form", glyph: "?" },
  { id: "website", label: "Website / page", glyph: "</>" },
  { id: "tool", label: "Tool / bot", glyph: "⚙" },
  { id: "data", label: "Data / sheets", glyph: "▦" },
];

/** The kind, or undefined when there's none (older builds may say "other": also none). */
export function kindOf(id) {
  return KINDS.find((k) => k.id === id);
}

// Every status a project can have (the API's list is PROJECT_STATUSES in worker/db/schema.ts).
export const STATUS = {
  new: "New request",
  in_progress: "In progress",
  done: "Done",
  declined: "Declined",
};

/** The number a requester gets back: PT-007. */
export function ticket(id) {
  return `PT-${String(id).padStart(3, "0")}`;
}

/** "Oct 2026" from a database timestamp. */
export function monthOf(timestamp) {
  return new Date(`${timestamp.replace(" ", "T")}Z`).toLocaleDateString("en", { month: "short", year: "numeric" });
}

/** "just now", "5 hr ago", "3 days ago"… from a database timestamp. */
export function ago(timestamp) {
  const ms = Date.now() - new Date(`${timestamp.replace(" ", "T")}Z`).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 2) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? "yesterday" : `${d} days ago`;
  const mo = Math.round(d / 30);
  return mo === 1 ? "a month ago" : `${mo} months ago`;
}
