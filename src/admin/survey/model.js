// The survey's questions, and turning raw spreadsheet rows into people and stats.
// Pure functions only (no React), so it's easy to check against a real export.
//
// Answers are matched by short key phrases rather than exact text, so small
// wording or spelling changes in a future export still land in the right place.
// An answer that matches nothing is kept and shown as written, never dropped.

/* ---------- Text ---------- */

/** Lowercase, no diacritics/tatweel, one form of alef/ya/ta marbuta, single spaces. */
export function norm(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[\s‌‏‎]+/g, " ")
    .trim();
}

export const isArabic = (s) => /[؀-ۿ]/.test(s ?? "");

const OTHER = /^\s*(أخرى|اخرى|other)\s*:?\s*/i;

/* ---------- Questions ---------- */

// Skill questions: four answers, lowest to highest. Their levels make the skill score.
export const SCALES = [
  {
    id: "experience",
    label: "Project experience",
    cols: ["Programming Experience", "Programming Experience — Answer"],
    levels: [
      { label: "No projects outside class", match: "ما بنيت" },
      { label: "One personal project", match: "مشروع شخصي واحد" },
      { label: "Several personal projects", match: "اكثر من مشروع" },
      { label: "Real-world project", match: "مشروع حقيقي" },
    ],
  },
  {
    id: "build",
    label: "Building alone",
    cols: ["Build Ability", "Build Ability — Answer"],
    levels: [
      { label: "Doesn't know where to start", match: "من وين ابدا" },
      { label: "Needs the steps laid out", match: "الخطوات محدده" },
      { label: "Starts alone, needs help midway", match: "احتاج مساعده" },
      { label: "Builds a full project alone", match: "كامل بنفسي" },
    ],
  },
  {
    id: "git",
    label: "Git & GitHub",
    cols: ["Git/GitHub Usage", "Git/GitHub — Answer"],
    levels: [
      { label: "Doesn't use them", match: "ما استخدمهم" },
      { label: "commit · push · pull", match: "push" },
      { label: "Branches, PRs, conflicts", match: "branches" },
      { label: "Runs a team's Git workflow", match: "workflow" },
    ],
  },
  {
    id: "ai",
    label: "AI tools",
    cols: ["AI Usage", "AI Usage — Answer"],
    levels: [
      { label: "Copies code from a chat", match: "انقله" },
      { label: "Shares files, applies edits", match: "ارسل له ملفات" },
      { label: "AI edits files in the IDE", match: "بيئه التطوير" },
      { label: "Runs AI as an agent", match: "agent" },
    ],
  },
  {
    id: "team",
    label: "Teamwork",
    cols: ["Teamwork Experience", "Teamwork — Answer"],
    levels: [
      { label: "No team project yet", match: "ما اشتغلت" },
      { label: "In a team, others assign", match: "احد غيري" },
      { label: "Splits and merges team work", match: "تقسيم المهام" },
      { label: "Organizes the team", match: "انظم" },
    ],
  },
];

// One-answer questions.
export const SINGLES = [
  {
    id: "role",
    label: "Preferred team role",
    cols: ["Preferred Team Role"],
    options: [
      { label: "Frontend", match: "frontend" },
      { label: "Backend", match: "backend" },
      { label: "UI design", match: "تصميم" },
      { label: "Leading / organizing", match: "تنظيم" },
      { label: "Not sure yet", match: "ما اعرف" },
    ],
  },
  {
    id: "format",
    label: "Activity format",
    cols: ["Activity Format"],
    options: [
      { label: "Both work", match: "الاثنين" },
      { label: "Online", match: "اونلاين" },
      { label: "In person", match: "حضوري" },
    ],
  },
  {
    id: "learning",
    label: "Learning preference",
    cols: ["Learning Preference"],
    options: [
      { label: "A mix of both", match: "مزيج" },
      { label: "Go deeper in what they know", match: "اتعمق" },
      { label: "Learn something new", match: "جديد" },
    ],
  },
  {
    id: "helping",
    label: "Helping others",
    cols: ["Helping Preference"],
    options: [
      { label: "Likes to teach, would run a session", match: "اشرح" },
      { label: "Helps when asked", match: "اذا احد سالني" },
    ],
  },
  {
    id: "blocker",
    label: "What could get in the way",
    cols: ["Potential Blocker"],
    options: [
      { label: "Study and exam pressure", match: "ضغط الدراسه" },
      { label: "Content above their level", match: "اصعب" },
      { label: "Losing motivation over time", match: "الحماس" },
    ],
  },
];

// Pick-several questions (answers separated by commas in the sheet).
export const MULTIS = [
  {
    id: "interests",
    label: "Interests",
    cols: ["Interests", "Workshop Interests"],
    options: [],
  },
  {
    id: "tech",
    label: "Technologies used",
    cols: ["Technologies Used", "Technologies"],
    options: [{ label: "AI / ML libraries", match: "مكتبات ai" }],
  },
  {
    id: "activities",
    label: "Activities they want",
    cols: ["Preferred Activities"],
    options: [
      { label: "Hands-on workshops", match: "ورش تطبيقيه" },
      { label: "Hackathons & challenges", match: "هاكاثون" },
      { label: "A team project all semester", match: "مشروع جماعي" },
      { label: "Talks from people in the industry", match: "متحدثين" },
      { label: "Solving problems together", match: "نحل" },
    ],
  },
  {
    id: "avoid",
    label: "What would put them off",
    cols: ["Track Avoidances"],
    options: [
      { label: "Lots of meetings with no clear point", match: "اجتماعات" },
      { label: "Theory-only workshops", match: "ورش نظريه" },
      { label: "Content above their level", match: "اصعب" },
      { label: "Content below their level", match: "اسهل" },
    ],
  },
  {
    id: "times",
    label: "Preferred times",
    cols: ["Preferred Times"],
    options: [
      { label: "Weekends", match: "نهايه الاسبوع" },
      { label: "Weekday mornings", match: "الصباح" },
      { label: "Weekday evenings", match: "المساء" },
      { label: "Any time", match: "ما يفرق" },
    ],
  },
];

// Free-text answers worth reading one by one.
export const TEXTS = [
  { id: "success", label: "What would make the track worth it", cols: ["Success Definition"] },
  { id: "note", label: "Note to the leaders", cols: ["Leadership Note"] },
  { id: "learningDetails", label: "What they want to go deeper in", cols: ["Learning Preference Details"] },
];

const NAME_COLS = ["Full Name", "Name", "الاسم", "الاسم الكامل"];
const TIME_COLS = ["Submitted At", "Timestamp", "Submitted"];

const MAJORS = [
  { label: "Software Engineering", test: /برمج|software/ },
  { label: "Computer Science", test: /علوم ?ال?حاسب|computer science|\bcs\b/ },
  { label: "Computer & Network Eng.", test: /حاسب|شبكات|computer eng|network/ },
  { label: "Artificial Intelligence", test: /ذكاء|artificial|\bai\b/ },
  { label: "Cybersecurity", test: /سيبران|امن|cyber/ },
  { label: "Data Science", test: /بيانات|data/ },
  { label: "Information Systems", test: /نظم|information/ },
  { label: "Electrical Engineering", test: /كهرب|electrical/ },
  { label: "Media", test: /اعلام|media/ },
];
const YEARS = [/اول|first|\b1\b/, /ثاني|second|\b2\b/, /ثالث|third|\b3\b/, /رابع|fourth|\b4\b/, /خامس|fifth|\b5\b/, /سادس|sixth|\b6\b/];

export const TIERS = [
  { id: "beginner", label: "Starting out", min: 0 },
  { id: "intermediate", label: "Building up", min: 34 },
  { id: "advanced", label: "Confident", min: 67 },
];
export const tierOf = (score) => (score == null ? null : [...TIERS].reverse().find((t) => score >= t.min));

const pick = (answers, cols) => {
  for (const c of cols) if (answers[c]) return answers[c];
  return "";
};

const matchOption = (options, text) => {
  const t = norm(text);
  return options.findIndex((o) => t.includes(norm(o.match)));
};

/** One answer of a one-answer question → { label, raw, other } (other = a written-in "Other: …"). */
function single(q, answers) {
  const raw = pick(answers, q.cols);
  if (!raw) return null;
  if (OTHER.test(raw)) return { label: "Other", raw, other: raw.replace(OTHER, "").trim() };
  const i = matchOption(q.options, raw);
  return { label: i >= 0 ? q.options[i].label : raw, raw };
}

/** Answers of a pick-several question → [{ label, raw, other }]. */
function multi(q, answers) {
  const raw = pick(answers, q.cols);
  if (!raw) return [];
  const out = [];
  for (const piece of raw.split(/\s*,\s*/)) {
    if (!piece) continue;
    if (OTHER.test(piece)) {
      out.push({ label: "Other", raw: piece, other: piece.replace(OTHER, "").trim() || null });
    } else {
      const i = matchOption(q.options, piece);
      out.push({ label: i >= 0 ? q.options[i].label : piece, raw: piece });
    }
  }
  // The same answer twice in one row counts once.
  return out.filter((a, i) => a.other || out.findIndex((b) => b.label === a.label) === i);
}

export const majorLabel = (raw) => {
  const t = norm(raw);
  return MAJORS.find((m) => m.test.test(t))?.label ?? (raw || null);
};
const yearOf = (raw) => {
  const t = norm(raw);
  const i = YEARS.findIndex((y) => y.test(t));
  return i >= 0 ? i + 1 : null;
};

/* ---------- Rows from a sheet ---------- */

export const nameOf = (row) => pick(row, NAME_COLS).replace(/\s+/g, " ").trim();
export const timeOf = (row) => pick(row, TIME_COLS);

/** Checks a parsed sheet looks like this survey; returns the problem in words, or null. */
export function checkSheet(headers) {
  const has = (cols) => cols.some((c) => headers.includes(c));
  if (!has(NAME_COLS)) return `There's no name column (expected "${NAME_COLS[0]}").`;
  const known = [...SCALES, ...SINGLES, ...MULTIS, ...TEXTS].filter((q) => has(q.cols)).length;
  if (known < 4) return "This doesn't look like the members survey: most of its questions are missing.";
  return null;
}

/** Spreadsheet rows → what the import endpoint stores. */
export function toImportRows(rows, linkFor) {
  return rows
    .map((answers) => {
      const name = nameOf(answers);
      const submittedAt = timeOf(answers);
      if (!name && !submittedAt) return null;
      const respondent = norm(name) || `anonymous ${submittedAt}`;
      return { respondent, name: name || "Anonymous", submittedAt: submittedAt || "unknown", memberId: linkFor(respondent, name), answers };
    })
    .filter(Boolean);
}

/* ---------- Matching names to the roster ---------- */

const tokens = (s) =>
  norm(s)
    .replace(/[^\p{L}\p{N} -]/gu, " ")
    .split(/[\s-]+/)
    .filter((t) => t.length > 1);

function similar(a, b) {
  if (a === b) return 1;
  if (Math.abs(a.length - b.length) > 3) return 0;
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[b.length] / Math.max(a.length, b.length);
}

/**
 * The roster member a survey name most likely belongs to, or null when unsure.
 * Compares words against the member's name, card name and link id (which is a
 * Latin spelling, so "Joury Almutairi" still finds "جوري فيصل المطيري").
 */
export function matchMember(name, members) {
  const words = tokens(name);
  if (!words.length) return null;
  const scored = members
    .map((m) => {
      const variants = [tokens(m.name), tokens(m.short ?? ""), tokens(m.id)].filter((v) => v.length);
      let best = 0;
      for (const v of variants) {
        const firstOk = similar(words[0], v[0]) >= 0.75;
        if (!firstOk) continue;
        // Each word scores its closest match (so "farah" beats "sarah" for Farah).
        const hits = words.reduce((n, w) => {
          const s = Math.max(...v.map((x) => similar(w, x)));
          return n + (s >= 0.75 ? s : 0);
        }, 0);
        best = Math.max(best, hits / Math.max(words.length, Math.min(v.length, 3)));
      }
      return { m, score: best };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  const [top, next] = scored;
  if (!top || top.score < 0.3) return null;
  if (next && next.score === top.score) return null; // a tie: let the admin decide
  return top.m.id;
}

/* ---------- People ---------- */

/**
 * Stored responses + roster → one person per respondent, using their latest
 * submission. Members who haven't answered come back in `missing`.
 */
export function buildPeople(responses, members) {
  const byKey = new Map();
  for (const r of responses) {
    const list = byKey.get(r.respondent) ?? [];
    list.push(r);
    byKey.set(r.respondent, list);
  }
  const memberById = new Map(members.map((m) => [m.id, m]));

  const people = [...byKey.values()].map((subs) => {
    subs.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    const latest = subs.at(-1);
    const a = latest.answers;
    const memberId = subs.findLast((s) => s.memberId)?.memberId ?? null;
    const member = memberId ? memberById.get(memberId) ?? null : null;

    const levels = {};
    for (const q of SCALES) {
      const raw = pick(a, q.cols);
      const i = raw ? matchOption(q.levels, raw) : -1;
      levels[q.id] = { level: i >= 0 ? i : null, raw, label: i >= 0 ? q.levels[i].label : raw || null };
    }
    const known = Object.values(levels).filter((l) => l.level != null);
    const score = known.length ? Math.round((known.reduce((n, l) => n + l.level, 0) / (known.length * 3)) * 100) : null;

    const singles = Object.fromEntries(SINGLES.map((q) => [q.id, single(q, a)]));
    const multis = Object.fromEntries(MULTIS.map((q) => [q.id, multi(q, a)]));
    const texts = Object.fromEntries(TEXTS.map((q) => [q.id, pick(a, q.cols) || null]));

    return {
      key: latest.respondent,
      id: memberId ?? latest.respondent,
      name: latest.name,
      memberId,
      member,
      submissions: subs.length,
      submittedAt: latest.submittedAt,
      firstSubmittedAt: subs[0].submittedAt,
      major: majorLabel(pick(a, ["Major", "التخصص"])),
      year: yearOf(pick(a, ["Academic Year", "Year", "السنة"])),
      color: a["Favorite Color"] ? { name: a["Favorite Color"], hex: /^#[0-9a-f]{3,8}$/i.test(a["Favorite Color Hex"] ?? "") ? a["Favorite Color Hex"] : null } : null,
      levels,
      score,
      tier: tierOf(score),
      singles,
      multis,
      texts,
      answers: a,
    };
  });

  people.sort((x, y) => (x.member?.name ?? x.name).localeCompare(y.member?.name ?? y.name, "ar"));
  const answered = new Set(people.map((p) => p.memberId).filter(Boolean));
  const missing = members.filter((m) => !answered.has(m.id));
  return { people, missing };
}

/* ---------- Stats ---------- */

/** Counts → [{ label, count, people }] sorted by count (or in `order` when given). */
function tally(people, get, order) {
  const map = new Map();
  for (const p of people) {
    for (const label of get(p)) {
      if (!label) continue;
      const e = map.get(label) ?? { label, count: 0, people: [] };
      e.count++;
      e.people.push(p);
      map.set(label, e);
    }
  }
  const items = [...map.values()];
  if (order) return order.map((label) => map.get(label) ?? { label, count: 0, people: [] }).concat(items.filter((i) => !order.includes(i.label)));
  return items.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const otherText = (list) => list.filter((a) => a.other).map((a) => a.other);

export function analyze(people) {
  const n = people.length;
  const withScore = people.filter((p) => p.score != null);
  const avg = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

  const scales = SCALES.map((q) => {
    const answered = people.filter((p) => p.levels[q.id].level != null);
    return {
      ...q,
      answered: answered.length,
      average: avg(answered.map((p) => p.levels[q.id].level)),
      counts: q.levels.map((l, i) => ({ label: l.label, level: i, people: answered.filter((p) => p.levels[q.id].level === i) })),
      unmatched: people.filter((p) => p.levels[q.id].level == null && p.levels[q.id].raw),
    };
  });

  const singles = Object.fromEntries(
    SINGLES.map((q) => [
      q.id,
      { ...q, items: tally(people, (p) => [p.singles[q.id]?.label]), others: people.filter((p) => p.singles[q.id]?.other).map((p) => ({ person: p, text: p.singles[q.id].other })) },
    ])
  );
  const multis = Object.fromEntries(
    MULTIS.map((q) => [
      q.id,
      {
        ...q,
        items: tally(people, (p) => [...new Set(p.multis[q.id].map((a) => a.label))]),
        others: people.flatMap((p) => otherText(p.multis[q.id]).map((text) => ({ person: p, text }))),
      },
    ])
  );

  // Who can make each time slot: the slots they picked, plus everyone who said "any time".
  const slots = MULTIS.find((q) => q.id === "times").options.filter((o) => o.label !== "Any time");
  const anyTime = people.filter((p) => p.multis.times.some((t) => t.label === "Any time"));
  const availability = slots
    .map((s) => {
      const picked = people.filter((p) => p.multis.times.some((t) => t.label === s.label));
      return { label: s.label, count: picked.length + anyTime.filter((p) => !picked.includes(p)).length, people: [...new Set([...picked, ...anyTime])] };
    })
    .sort((a, b) => b.count - a.count);

  const tiers = TIERS.map((t) => ({ label: t.label, id: t.id, people: withScore.filter((p) => p.tier.id === t.id) })).map((t) => ({ ...t, count: t.people.length }));

  const has = (p, q, label) => p.singles[q]?.label === label;
  const insights = {
    mentors: withScore.filter((p) => has(p, "helping", "Likes to teach, would run a session") && p.score >= 67).sort((a, b) => b.score - a.score),
    teachers: people.filter((p) => has(p, "helping", "Likes to teach, would run a session")),
    support: people
      .filter((p) => (p.score != null && p.score < 34) || (p.levels.build.level != null && p.levels.build.level <= 1) || has(p, "blocker", "Content above their level"))
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0)),
    leaders: people.filter((p) => has(p, "role", "Leading / organizing") || p.levels.team.level === 3),
    noGit: people.filter((p) => p.levels.git.level === 0),
    noTeam: people.filter((p) => p.levels.team.level === 0),
    noProjects: people.filter((p) => p.levels.experience.level === 0),
  };

  return {
    n,
    averageScore: avg(withScore.map((p) => p.score)),
    scales,
    singles,
    multis,
    availability,
    anyTime: anyTime.length,
    tiers,
    majors: tally(people, (p) => [p.major]),
    years: tally(
      people.filter((p) => p.year),
      (p) => [`Year ${p.year}`],
      [1, 2, 3, 4, 5, 6].map((y) => `Year ${y}`).filter((y) => people.some((p) => `Year ${p.year}` === y))
    ),
    colors: tally(people.filter((p) => p.color), (p) => [p.color.name]).map((c) => ({ ...c, hex: c.people[0].color.hex })),
    texts: Object.fromEntries(TEXTS.map((q) => [q.id, { ...q, entries: people.filter((p) => p.texts[q.id]).map((p) => ({ person: p, text: p.texts[q.id] })) }])),
    insights,
  };
}

/* ---------- Teams ---------- */

/**
 * Splits people into `count` teams with a similar spread of skill and roles:
 * strongest first, each into the team that's smallest, then most lacking their
 * role, then weakest so far. `seed` shuffles people with equal scores.
 */
export function buildTeams(people, count, seed = 0) {
  const rand = mulberry(seed);
  const pool = people
    .filter((p) => p.score != null)
    .map((p) => ({ p, r: rand() }))
    .sort((a, b) => b.p.score - a.p.score || a.r - b.r)
    .map((x) => x.p);
  const teams = Array.from({ length: Math.max(1, count) }, () => ({ members: [], total: 0 }));
  const roleOf = (p) => p.singles.role?.label ?? "Not sure yet";
  for (const p of pool) {
    const role = roleOf(p);
    const target = [...teams].sort(
      (a, b) =>
        a.members.length - b.members.length ||
        a.members.filter((m) => roleOf(m) === role).length - b.members.filter((m) => roleOf(m) === role).length ||
        a.total - b.total ||
        rand() - 0.5
    )[0];
    target.members.push(p);
    target.total += p.score;
  }
  return teams.map((t, i) => ({
    name: `Team ${i + 1}`,
    members: t.members,
    average: t.members.length ? t.total / t.members.length : 0,
    roles: tally(t.members, (p) => [roleOf(p)]),
  }));
}

function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Export ---------- */

/** One row per person (latest answers), with the derived levels: a clean CSV to share or sort in Excel. */
export function toCsv(people) {
  const cols = [
    ["Name", (p) => p.name],
    ["Member", (p) => p.member?.name ?? ""],
    ["Major", (p) => p.major ?? ""],
    ["Year", (p) => p.year ?? ""],
    ["Submitted", (p) => p.submittedAt],
    ["Submissions", (p) => p.submissions],
    ["Skill score", (p) => p.score ?? ""],
    ["Level", (p) => p.tier?.label ?? ""],
    ...SCALES.map((q) => [`${q.label} (0-3)`, (p) => p.levels[q.id].level ?? ""]),
    ...SCALES.map((q) => [q.label, (p) => p.levels[q.id].raw]),
    ...SINGLES.map((q) => [q.label, (p) => p.singles[q.id]?.raw ?? ""]),
    ...MULTIS.map((q) => [q.label, (p) => p.multis[q.id].map((a) => a.raw).join(", ")]),
    ...TEXTS.map((q) => [q.label, (p) => p.texts[q.id] ?? ""]),
    ["Favorite color", (p) => p.color?.name ?? ""],
  ];
  const cell = (v) => {
    const s = String(v ?? "");
    // Quote everything; neutralize leading =,+,-,@ so Excel never runs a cell as a formula.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const lines = [cols.map(([h]) => cell(h)).join(","), ...people.map((p) => cols.map(([, get]) => cell(get(p))).join(","))];
  return "﻿" + lines.join("\r\n");
}
