// The database tables. After changing this file, run `npm run db:generate` to
// write a migration into migrations/, then apply it (see README → Database).
import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  position: integer("position").notNull().default(0),
  ...timestamps,
});

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
// "announcement" (the purple "Up next" tile), and whatever comes next.
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export * from "./auth-schema";
