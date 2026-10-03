// Small display helpers shared by the survey views.

// Skill levels, lowest to highest: one violet ramp, brighter = higher on the dark panel.
export const LEVEL_COLORS = ["#5a48a8", "#7c64dc", "#a38cff", "#d4c7ff"];
export const LEVEL_NAMES = ["Level 1", "Level 2", "Level 3", "Level 4"];

// Answers of one question, in a fixed order (most common first): violet, teal,
// orange, pink, blue, then gray for the rest. Checked for color-blind separation on the dark panels.
export const SPLIT_COLORS = ["#8f6cf0", "#1f9e93", "#c9741f", "#d55181", "#4f8fe0"];
export const REST_COLOR = "#4a4366";

export const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);
export const questionHref = (id) => `#admin/survey/questions/${id}`;
export const personHref = (p) => `#admin/survey/people/${encodeURIComponent(p.id)}`;
export const displayName = (p) => p.member?.name ?? p.name;
