// Small display helpers shared by the survey views.

// Skill levels, lowest to highest: one violet ramp, brighter = higher on the dark panel.
export const LEVEL_COLORS = ["#5a48a8", "#7c64dc", "#a38cff", "#d4c7ff"];
export const LEVEL_NAMES = ["Level 1", "Level 2", "Level 3", "Level 4"];

export const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);
export const personHref = (p) => `#admin/survey/people/${encodeURIComponent(p.id)}`;
export const displayName = (p) => p.member?.name ?? p.name;
