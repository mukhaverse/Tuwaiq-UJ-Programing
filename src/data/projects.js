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
//   kind       one of KINDS below
//   status     see STATUS below; the site only gets the ones the API makes public
//   note       one public line about where it's at
//   updatedAt  "YYYY-MM-DD HH:MM:SS", UTC
//   members    ids of the members working on it
export let projects = [];

export function setProjects(list) {
  projects = list;
}

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

// What people can ask for. A new kind is one line here: the API accepts any id.
export const KINDS = [
  { id: "survey", label: "Survey / form", glyph: "?" },
  { id: "website", label: "Website / page", glyph: "</>" },
  { id: "tool", label: "Tool / bot", glyph: "⚙" },
  { id: "data", label: "Data / sheets", glyph: "▦" },
  { id: "other", label: "Something else", glyph: "✦" },
];

export function kindOf(id) {
  return KINDS.find((k) => k.id === id) ?? KINDS.at(-1);
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
