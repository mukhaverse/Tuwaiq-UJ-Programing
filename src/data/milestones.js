// The semester journey, in order. Flip `done` to true as the track gets there;
// the first milestone that isn't done is automatically shown as "up next".
// Everything after "up next" stays locked on the site: the next two show as
// blank, locked steps, and the trail fades out after them, so nobody can tell
// what's coming or how many are left. Fill them in freely — they only reveal
// themselves once the milestone before them is done.
//
//   id     unique key (badges can point at it via `milestone`)
//   title  short name
//   when   free-form label: a week, a date, "TBA"…
//   note   one line of detail
//   done   true once it has happened
export const milestones = [
  {
    id: "first-meeting",
    title: "First meeting",
    when: "Week 1",
    note: "Intros, goals for the semester, and picking our tools.",
    done: true,
  },
  {
    id: "setup-workshop",
    title: "Dev setup workshop",
    when: "Week 3",
    note: "Git, editors and a working environment on every laptop.",
    done: false,
  },
  {
    id: "mini-project",
    title: "First mini project",
    when: "Week 6",
    note: "Small teams ship something tiny, start to finish.",
    done: false,
  },
  {
    id: "hack-night",
    title: "Team hack night",
    when: "Week 9",
    note: "One evening, one idea per team, pizza included.",
    done: false,
  },
  {
    id: "showcase",
    title: "End-of-semester showcase",
    when: "Week 12",
    note: "Everyone demos what they built.",
    done: false,
  },
];

// How many locked steps are shown after "up next" before the trail fades out.
export const LOCKED_SHOWN = 2;

export function milestoneStatus(index) {
  if (milestones[index].done) return "done";
  const next = milestones.findIndex((m) => !m.done);
  return index === next ? "next" : "locked";
}
