// The semester journey, in order, loaded from the database at startup (see
// content.js). The first milestone that isn't done is shown as "up next".
// Everything after it stays locked on the site: the next two show as blank,
// locked steps, and the trail fades out after them, so nobody can tell what's
// coming or how many are left.
//
//   id     unique key (badges can point at it via `milestone`)
//   title  short name
//   when   free-form label: a week, a date, "TBA"…
//   note   one line of detail
//   done   true once it has happened
export let milestones = [];

export function setMilestones(list) {
  milestones = list;
}

// How many locked steps are shown after "up next" before the trail fades out.
export const LOCKED_SHOWN = 2;

export function milestoneStatus(index) {
  if (milestones[index].done) return "done";
  const next = milestones.findIndex((m) => !m.done);
  return index === next ? "next" : "locked";
}
