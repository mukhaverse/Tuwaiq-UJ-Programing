// The semester journey, in order. Flip `done` to true as the track gets there;
// the first milestone that isn't done is automatically shown as "up next".
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
    id: "showcase",
    title: "End-of-semester showcase",
    when: "Week 12",
    note: "Everyone demos what they built.",
    done: false,
  },
];

export function milestoneStatus(index) {
  if (milestones[index].done) return "done";
  const next = milestones.findIndex((m) => !m.done);
  return index === next ? "next" : "upcoming";
}
