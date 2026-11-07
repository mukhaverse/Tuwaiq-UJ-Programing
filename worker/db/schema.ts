// The database tables. After changing this file, run `npm run db:generate` to
// write a migration into migrations/, then apply it (see README → Database).
import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { COMMITTEES } from "../../src/data/crew";
import { STATUSES, SUBMISSION_KINDS } from "../../src/data/portfolio";
import { user } from "./auth-schema";

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
  // Accessory ids from src/data/looks.ts, one per spot (head, face, mustache, mouth).
  avatarWear: text("avatar_wear", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
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

// People from other committees who worked at an event, shown on that event's playground.
// Added per event, so someone at two events is two rows. The character ids and which
// committee may use them live in src/data/crew.ts.
export const eventCrew = sqliteTable(
  "event_crew",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    milestoneId: text("milestone_id")
      .notNull()
      .references(() => milestones.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    committee: text("committee", { enum: COMMITTEES }).notNull(),
    character: text("character").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("event_crew_milestone").on(t.milestoneId)]
);

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

// Every bio suggested from a profile card on the site, oldest first. Nothing goes
// live until an admin uses one (Members → Bio suggestions), which writes it to members.bio.
export const bioEdits = sqliteTable(
  "bio_edits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    bio: text("bio").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("bio_edits_member").on(t.memberId)]
);

// Accessories an admin has given a member, beyond the starter set. The ids live in
// src/data/looks.ts, not in a table, so they aren't foreign keys: an id that leaves
// the catalog is simply ignored when read.
export const memberAccessories = sqliteTable(
  "member_accessories",
  {
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    accessoryId: text("accessory_id").notNull(),
    awardedAt: text("awarded_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.accessoryId] })]
);

// Looks chosen from a member's profile. Those go live straight away (logged as approved);
// "pending" ones are from before that, waiting for an admin.
export const lookEdits = sqliteTable(
  "look_edits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    char: text("char").notNull(),
    body: text("body").notNull(),
    wear: text("wear", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    status: text("status", { enum: ["pending", "approved", "discarded"] }).notNull().default("pending"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("look_edits_member").on(t.memberId)]
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

/* ---------- Portfolio task: the official roster and who's linked to it ----------
   Private: only the /api/portfolio routes read these, never /api/content. */

// Programming Track members from the club's registration sheet, imported by a leader.
// The email is how a member proves who they are (a code is sent to it), stored
// trimmed and lowercased. Inactive members keep their history but lose access.
export const roster = sqliteTable("roster", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  // Their public member card on the site, found automatically by an exact name match
  // (ignoring case and extra spaces), so the portfolio pages can show their character.
  // Read only: the character itself lives on the member card (members table).
  memberId: text("member_id")
    .unique()
    .references(() => members.id, { onDelete: "set null" }),
  ...timestamps,
});

// Every member sign-in attempt by email, for the leaders (dashboard → Sign-ins) and to
// slow down guessing: too many misses from one visitor and the form stops answering.
export const memberSignins = sqliteTable(
  "member_signins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // The roster member it matched; null for an email that isn't on the roster.
    rosterId: integer("roster_id").references(() => roster.id, { onDelete: "set null" }),
    // What was typed, trimmed and lowercased.
    email: text("email").notNull(),
    ok: integer("ok", { mode: "boolean" }).notNull(),
    // Only used to count misses per visitor; never shown.
    ip: text("ip").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("member_signins_created").on(t.createdAt), index("member_signins_ip").on(t.ip, t.createdAt)]
);

// A verified link between a roster member and the login (GitHub account) that proved
// it owns their email. One login per member and one member per login, held by the
// database itself: a second claim fails on the unique keys, however it's attempted.
export const rosterLinks = sqliteTable("roster_links", {
  rosterId: integer("roster_id")
    .primaryKey()
    .references(() => roster.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  linkedAt: text("linked_at").notNull().default(sql`(datetime('now'))`),
});

// One-time codes emailed to a roster address. Only a keyed hash of the code is kept;
// each is single-use, expires after a few minutes and allows a few wrong tries.
export const emailCodes = sqliteTable(
  "email_codes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rosterId: integer("roster_id")
      .notNull()
      .references(() => roster.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("email_codes_user").on(t.userId), index("email_codes_roster").on(t.rosterId)]
);

export const ACCESS_EVENT_KINDS = [
  "linked",
  "unlinked",
  "blocked",
  "unblocked",
  "not_on_roster",
  "already_linked",
  "wrong_code",
  "too_many_tries",
  "email_failed",
  "several_matches",
  "github_set",
  "github_cleared",
  "character_set",
] as const;

// Sign-up and access history for the leaders: links made and removed, and the problems
// (an email that isn't on the roster, a member someone else already linked…).
export const accessEvents = sqliteTable(
  "access_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: ACCESS_EVENT_KINDS }).notNull(),
    rosterId: integer("roster_id").references(() => roster.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    // Who it was (their GitHub name), what they typed, or which leader did it.
    detail: text("detail").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("access_events_created").on(t.createdAt)]
);

/* ---------- Portfolio task: submissions, reviews, the conversation ---------- */

// One per roster member, made when they link (or first touched). `seq` counts every
// change of state; each change writes portfolio_events (rosterId, seq + 1), whose unique
// key makes a double click or two leaders acting at once fail instead of applying twice.
export const portfolioTasks = sqliteTable("portfolio_tasks", {
  rosterId: integer("roster_id")
    .primaryKey()
    .references(() => roster.id, { onDelete: "cascade" }),
  status: text("status", { enum: STATUSES }).notNull().default("not_started"),
  seq: integer("seq").notNull().default(0),
  // Final corrections asked for so far (capped by MAX_CORRECTIONS).
  corrections: integer("corrections").notNull().default(0),
  currentUrl: text("current_url"),
  initialAt: text("initial_at"),
  revisedAt: text("revised_at"),
  completedAt: text("completed_at"),
  completedBy: text("completed_by"),
  lastActivityAt: text("last_activity_at").notNull().default(sql`(datetime('now'))`),
  ...timestamps,
});

// Every portfolio a member sent, oldest first. Never edited or removed.
export const portfolioSubmissions = sqliteTable(
  "portfolio_submissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    rosterId: integer("roster_id")
      .notNull()
      .references(() => roster.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    kind: text("kind", { enum: SUBMISSION_KINDS }).notNull(),
    url: text("url").notNull(),
    // Late against the deadline it counted for; null when it had none.
    late: integer("late", { mode: "boolean" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("portfolio_submissions_version").on(t.rosterId, t.version)]
);

export const PORTFOLIO_EVENT_KINDS = ["submitted", "revisions_requested", "approved"] as const;

// The review history: each change of state, who made it and from what to what.
export const portfolioEvents = sqliteTable(
  "portfolio_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    rosterId: integer("roster_id")
      .notNull()
      .references(() => roster.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    kind: text("kind", { enum: PORTFOLIO_EVENT_KINDS }).notNull(),
    fromStatus: text("from_status", { enum: STATUSES }).notNull(),
    toStatus: text("to_status", { enum: STATUSES }).notNull(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    actorName: text("actor_name").notNull(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [uniqueIndex("portfolio_events_seq").on(t.rosterId, t.seq)]
);

export const MESSAGE_KINDS = ["comment", "submission", "feedback", "revisions", "approval"] as const;

// The member's conversation with the leaders, in order: questions and replies, the note
// sent with each submission, and the leaders' official feedback. There are no routes
// that edit or delete these, for anyone.
export const portfolioMessages = sqliteTable(
  "portfolio_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    rosterId: integer("roster_id")
      .notNull()
      .references(() => roster.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    authorName: text("author_name").notNull(),
    authorRole: text("author_role", { enum: ["member", "leader"] }).notNull(),
    kind: text("kind", { enum: MESSAGE_KINDS }).notNull(),
    body: text("body").notNull().default(""),
    // The submission this message came with (kind "submission"), by version.
    version: integer("version"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("portfolio_messages_roster").on(t.rosterId, t.createdAt)]
);

// When each person last opened a member's thread, so newer messages show as new.
export const portfolioReads = sqliteTable(
  "portfolio_reads",
  {
    rosterId: integer("roster_id")
      .notNull()
      .references(() => roster.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    readAt: text("read_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [primaryKey({ columns: [t.rosterId, t.userId] })]
);

export const NOTIFICATION_KINDS = [
  // For the leaders
  "submitted",
  "resubmitted",
  "url_updated",
  "member_comment",
  // For the member
  "feedback",
  "reply",
  "revisions_requested",
  "reviewed",
  "approved",
] as const;

// In-app notifications. "leaders" ones are for every leader, "member" ones for the
// member of rosterId. Whether someone has read one is kept per person in
// notification_reads, so one leader reading it leaves it unread for the other.
export const notifications = sqliteTable(
  "notifications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    audience: text("audience", { enum: ["leaders", "member"] }).notNull(),
    rosterId: integer("roster_id")
      .notNull()
      .references(() => roster.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: NOTIFICATION_KINDS }).notNull(),
    actorName: text("actor_name").notNull(),
    // Unique per event, so the same event can't notify twice.
    dedupeKey: text("dedupe_key").notNull().unique(),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [index("notifications_audience").on(t.audience, t.rosterId)]
);

export const notificationReads = sqliteTable(
  "notification_reads",
  {
    notificationId: integer("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    readAt: text("read_at").notNull().default(sql`(datetime('now'))`),
  },
  (t) => [primaryKey({ columns: [t.notificationId, t.userId] })]
);

export * from "./auth-schema";
