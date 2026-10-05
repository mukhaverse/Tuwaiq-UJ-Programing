// The database tables. After changing this file, run `npm run db:generate` to
// write a migration into migrations/, then apply it (see README → Database).
import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
};

export const members = sqliteTable("members", {
  // URL-safe slug, used in links like #member/shumokh.
  id: text("id").primaryKey(),
  // Full name, exactly as the member wrote it.
  name: text("name").notNull(),
  // Card name, when "first + last word" of the full name gets it wrong.
  short: text("short"),
  role: text("role", { enum: ["leader", "co-leader", "member"] }).notNull().default("member"),
  major: text("major").notNull(),
  year: integer("year").notNull(),
  bio: text("bio"),
  // What their character says on the playground board.
  quote: text("quote"),
  avatarChar: text("avatar_char").notNull().default("blob"),
  avatarBody: text("avatar_body").notNull().default("butter"),
  // Roster order: the first few stand on the Commit Mountain in the hero.
  position: integer("position").notNull().default(0),
  ...timestamps,
});

export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  // Free-form label: a week, a date, "TBA"…
  when: text("when_label").notNull().default("TBA"),
  note: text("note").notNull().default(""),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  // Photos from the event, in order, shown as a pile of Polaroids on the site.
  // Each url is a file uploaded in the admin panel (/api/media/…).
  photos: text("photos", { mode: "json" }).$type<MilestonePhoto[]>().notNull().default(sql`'[]'`),
  position: integer("position").notNull().default(0),
  ...timestamps,
});

// w and h: the image's size in pixels, which picks its Polaroid's shape (wide, square or tall).
export type MilestonePhoto = { url: string; caption: string; w?: number; h?: number };

export const badges = sqliteTable("badges", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  // 1–3 characters printed in the middle of the badge.
  glyph: text("glyph").notNull(),
  // The journey milestone this badge belongs to, if any.
  milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
  position: integer("position").notNull().default(0),
  ...timestamps,
});

export const memberBadges = sqliteTable(
  "member_badges",
  {
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    badgeId: text("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    awardedAt: text("awarded_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.badgeId] })]
);

// Site-wide values stored as JSON under a key: "track" (names and intro copy),
// "announcement" (the purple "Up next" tile), "requests" (whether the request
// form is open), and whatever comes next.
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// Answers to the members survey, imported from its spreadsheet export in the
// admin panel. Private: only the admin API reads this table, never /api/content.
export const surveyResponses = sqliteTable(
  "survey_responses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // The respondent's name, normalized, so repeat submissions group together.
    respondent: text("respondent").notNull(),
    // Their name exactly as they typed it.
    name: text("name").notNull(),
    // The roster member this person is, once linked (automatically on import, or by hand).
    memberId: text("member_id").references(() => members.id, { onDelete: "set null" }),
    submittedAt: text("submitted_at").notNull(),
    // Every non-empty cell of their row, keyed by the spreadsheet's column header.
    answers: text("answers", { mode: "json" }).$type<Record<string, string>>().notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  // Re-importing a newer export of the same sheet only adds the rows that are new.
  (t) => [uniqueIndex("survey_responses_unique").on(t.respondent, t.submittedAt), index("survey_responses_member").on(t.memberId)]
);

// The club's other tracks, each with its theme colour. A project linked to one
// is a collaboration, and shows in that track's colour on the site.
export const tracks = sqliteTable("tracks", {
  // URL-safe slug, like "media".
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // "#rrggbb"
  color: text("color").notNull(),
  position: integer("position").notNull().default(0),
  ...timestamps,
});

// What the track is building: collaborations with other tracks (often from a
// request submitted on the site) and its own projects (added in the admin panel).
// A new status only needs adding here; which ones the site shows is PUBLIC_PROJECT_STATUSES.
export const PROJECT_STATUSES = ["new", "in_progress", "done", "declined"] as const;
// In progress: on the TV. Done: filed in the "shipped" drawer.
export const PUBLIC_PROJECT_STATUSES = ["in_progress", "done"] as const;

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    // Set: a collaboration with that track. Empty: one of the track's own projects.
    trackId: text("track_id").references(() => tracks.id, { onDelete: "set null" }),
    // Projects only, optional: who it's for, e.g. "the whole club".
    forLabel: text("for_label"),
    // Optional: what kind of thing it is, "survey", "website"… (the list lives in
    // src/data/projects.js). "", "other" or any id that's not in the list means none.
    kind: text("kind").notNull().default("other"),
    status: text("status", { enum: PROJECT_STATUSES }).notNull().default("new"),
    // One short public sentence on what it is, under the title on the site.
    summary: text("summary").notNull().default(""),
    // One public line on the site, e.g. "Draft ready for review".
    note: text("note").notNull().default(""),
    // Private: what the requester asked for, who they are and how to reach them.
    details: text("details").notNull().default(""),
    requester: text("requester"),
    // Their track as they typed it, when it wasn't in the list.
    requesterTrack: text("track"),
    contact: text("contact"),
    // Free-form, as they wrote it: "before week 8", "ASAP"…
    deadline: text("deadline"),
    // When it was marked done (cleared if it's reopened). Shown on its folder in the drawer.
    finishedAt: text("finished_at"),
    ...timestamps,
  },
  (t) => [index("projects_status").on(t.status)]
);

// Who's working on what: roster members assigned to a project.
export const projectMembers = sqliteTable(
  "project_members",
  {
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.memberId] })]
);

export * from "./auth-schema";
