// The "Build Your Portfolio" task: its statuses, what moves a task from one to the
// next, the progress stepper, and deadline maths. Shared with the Worker, which
// enforces the same rules, so the UI and the database can't disagree. `npm test`.

export const STATUSES = [
  "not_started",
  "awaiting_initial_review",
  "revisions_requested",
  "awaiting_final_review",
  "final_correction_requested",
  "completed",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  not_started: "Not started",
  awaiting_initial_review: "Submitted · awaiting review",
  revisions_requested: "Revisions requested",
  awaiting_final_review: "Resubmitted · awaiting final review",
  final_correction_requested: "Final correction requested",
  completed: "Completed",
};

/** What each submission was: the first one, the revision after feedback, the one final
 *  correction, or a new URL sent while a review is still pending. */
export const SUBMISSION_KINDS = ["initial", "revision", "correction", "update"] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];

export const SUBMISSION_LABEL: Record<SubmissionKind, string> = {
  initial: "Initial portfolio",
  revision: "Revised portfolio",
  correction: "Final correction",
  update: "Updated URL",
};

/** How many times a leader may send a revised portfolio back once more. Keeps the
 *  review from going round forever. */
export const MAX_CORRECTIONS = 1;

export const STEPS = ["Not started", "Initial submission", "Feedback & revisions", "Revised submission", "Final review", "Completed"] as const;

/** Where a status sits on the stepper (index into STEPS) and how far along it is. */
export function progressOf(status: Status): { step: number; percent: number } {
  switch (status) {
    case "not_started":
      return { step: 0, percent: 0 };
    case "awaiting_initial_review":
      return { step: 1, percent: 25 };
    case "revisions_requested":
      return { step: 2, percent: 45 };
    case "awaiting_final_review":
      return { step: 4, percent: 75 };
    case "final_correction_requested":
      return { step: 4, percent: 85 };
    case "completed":
      return { step: 5, percent: 100 };
  }
}

/** What a member sending a portfolio now would be doing, or null when they can't. */
export function submissionKindFor(status: Status): SubmissionKind | null {
  switch (status) {
    case "not_started":
      return "initial";
    case "revisions_requested":
      return "revision";
    case "final_correction_requested":
      return "correction";
    case "awaiting_initial_review":
    case "awaiting_final_review":
      return "update";
    case "completed":
      return null;
  }
}

/** The status after a member submits. An update keeps the task where it is. */
export function statusAfterSubmit(status: Status): Status | null {
  switch (submissionKindFor(status)) {
    case "initial":
      return "awaiting_initial_review";
    case "revision":
    case "correction":
      return "awaiting_final_review";
    case "update":
      return status;
    default:
      return null;
  }
}

export type ReviewAction = "request_revisions" | "approve";

/** The status after a leader's decision, or null when that decision isn't possible now. */
export function statusAfterReview(status: Status, action: ReviewAction, correctionsUsed: number): Status | null {
  if (action === "approve") return status === "not_started" || status === "completed" ? null : "completed";
  if (status === "awaiting_initial_review") return "revisions_requested";
  if (status === "awaiting_final_review" && correctionsUsed < MAX_CORRECTIONS) return "final_correction_requested";
  return null;
}

/* ---------- Deadlines ----------
   Leaders add as many as they like. Each one may count for one kind of submission:
   "initial" (the first portfolio) or "revision" (the version after the first feedback),
   at most one of each. Those are what On time / Late and Overdue are measured against.
   The rest ("other") are dates on the calendar: shown with a countdown, never marking
   anyone late. It's all one task, with one portfolio link. */

export const DEADLINE_COUNTS = ["initial", "revision", "other"] as const;
export type DeadlineCounts = (typeof DEADLINE_COUNTS)[number];

export const DEADLINE_COUNTS_LABEL: Record<DeadlineCounts, string> = {
  initial: "Initial submission",
  revision: "Revised submission",
  other: "Just a date",
};

export type DeadlineItem = {
  /** Stable id, so edits keep pointing at the same deadline. */
  id: string;
  /** ISO 8601 instant. */
  due: string;
  title: string;
  note: string;
  counts: DeadlineCounts;
};

export type Deadlines = {
  items: DeadlineItem[];
  /** Off unless a leader turns it on: refuse submissions after their deadline. */
  closeAfterDeadline: boolean;
};

export const NO_DEADLINES: Deadlines = { items: [], closeAfterDeadline: false };
export const MAX_DEADLINES = 20;

/** The title to show: the leader's, or a plain one from what it counts for. */
export const deadlineTitle = (d: DeadlineItem) => d.title || (d.counts === "other" ? "Deadline" : DEADLINE_COUNTS_LABEL[d.counts]);

/**
 * The stored setting as Deadlines, whatever its shape. Also reads the first version's
 * { initialDue, revisedDue }, turning each into a deadline that counts the same way,
 * so nothing set before has to be re-entered.
 */
export function readDeadlines(raw: unknown): Deadlines {
  const v = (raw ?? {}) as Record<string, unknown>;
  const closeAfterDeadline = v.closeAfterDeadline === true;
  if (Array.isArray(v.items)) {
    const items = (v.items as Partial<DeadlineItem>[])
      .filter((d) => d && typeof d.id === "string" && typeof d.due === "string" && toDate(d.due))
      .map((d) => ({
        id: d.id!,
        due: d.due!,
        title: typeof d.title === "string" ? d.title : "",
        note: typeof d.note === "string" ? d.note : "",
        counts: DEADLINE_COUNTS.includes(d.counts as DeadlineCounts) ? (d.counts as DeadlineCounts) : "other",
      }));
    return { items: sortDeadlines(items), closeAfterDeadline };
  }
  const items: DeadlineItem[] = [];
  if (typeof v.initialDue === "string" && toDate(v.initialDue)) items.push({ id: "initial", due: v.initialDue, title: "", note: "", counts: "initial" });
  if (typeof v.revisedDue === "string" && toDate(v.revisedDue)) items.push({ id: "revision", due: v.revisedDue, title: "", note: "", counts: "revision" });
  return { items: sortDeadlines(items), closeAfterDeadline };
}

/** Earliest first. */
export const sortDeadlines = (items: DeadlineItem[]) => [...items].sort((a, b) => toDate(a.due)!.getTime() - toDate(b.due)!.getTime());

/** What's wrong with a list of deadlines, or null. Used by the Worker before saving. */
export function checkDeadlines(items: DeadlineItem[]): string | null {
  if (items.length > MAX_DEADLINES) return `Up to ${MAX_DEADLINES} deadlines.`;
  if (new Set(items.map((d) => d.id)).size !== items.length) return "Two deadlines have the same id.";
  for (const kind of ["initial", "revision"] as const) {
    if (items.filter((d) => d.counts === kind).length > 1) return `Only one deadline can count for the ${DEADLINE_COUNTS_LABEL[kind].toLowerCase()}.`;
  }
  const initial = dueFor({ items, closeAfterDeadline: false }, "initial");
  const revision = dueFor({ items, closeAfterDeadline: false }, "revision");
  if (initial && revision && toDate(revision)! <= toDate(initial)!) return "The revised submission deadline has to come after the initial one.";
  return null;
}

/** The due date of the deadline that counts for this kind of submission, if any. */
export function dueFor(deadlines: Deadlines, counts: "initial" | "revision"): string | null {
  return deadlines.items.find((d) => d.counts === counts)?.due ?? null;
}

/** The next deadline that hasn't passed yet, if any. */
export function nextDeadline(deadlines: Deadlines, now = new Date()): DeadlineItem | null {
  return sortDeadlines(deadlines.items).find((d) => toDate(d.due)!.getTime() >= now.getTime()) ?? null;
}

/** Which deadline a submission is measured against. Corrections and updates have none. */
export function deadlineKeyFor(kind: SubmissionKind): "initial" | "revision" | null {
  if (kind === "initial") return "initial";
  if (kind === "revision") return "revision";
  return null;
}

/**
 * A timestamp from the database or an ISO string, as a Date. SQLite's datetime('now')
 * gives "YYYY-MM-DD HH:MM:SS" in UTC with no zone marker, so that form is read as UTC.
 */
export function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Late or on time, or null when there was no deadline to measure against. */
export function isLate(submittedAt: Date, due: string | null): boolean | null {
  const d = toDate(due);
  return d ? submittedAt.getTime() > d.getTime() : null;
}

/** The deadline a task is currently working towards, if it's waiting on the member. */
export function pendingDeadline(status: Status, deadlines: Deadlines): string | null {
  if (status === "not_started") return dueFor(deadlines, "initial");
  if (status === "revisions_requested") return dueFor(deadlines, "revision");
  return null;
}

/** True when the member still owes a submission and its deadline has passed. */
export function isOverdue(status: Status, deadlines: Deadlines, now = new Date()): boolean {
  const d = toDate(pendingDeadline(status, deadlines));
  return Boolean(d && now.getTime() > d.getTime());
}

/** Whether a member may submit now (only false when a leader chose to close late submissions). */
export function submissionsClosed(status: Status, deadlines: Deadlines, now = new Date()): boolean {
  const kind = submissionKindFor(status);
  if (!kind || !deadlines.closeAfterDeadline) return false;
  const key = deadlineKeyFor(kind);
  const d = key ? toDate(dueFor(deadlines, key)) : null;
  return Boolean(d && now.getTime() > d.getTime());
}

/** Plain words for the time left until (or since) a deadline. */
export function timeLeft(due: string | null, now = new Date()): { overdue: boolean; text: string } | null {
  const d = toDate(due);
  if (!d) return null;
  const ms = d.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const mins = Math.max(1, Math.floor((abs % 3_600_000) / 60_000));
  const span = days >= 1 ? `${days} day${days === 1 ? "" : "s"}${days < 3 && hours ? ` ${hours}h` : ""}` : hours >= 1 ? `${hours}h ${mins}m` : `${mins} min`;
  return ms >= 0 ? { overdue: false, text: `${span} left` } : { overdue: true, text: `Overdue by ${span}` };
}

/** Emails are compared trimmed and lowercased, nothing more. */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Names are matched ignoring case and extra spaces (roster entry ↔ member card). */
export const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/** A portfolio link: http(s) only, a real host, no login details in it. Returns the URL or an error message. */
export function checkPortfolioUrl(input: string): { url: string } | { error: string } {
  const text = input.trim();
  if (!text) return { error: "Add your portfolio's link." };
  if (text.length > 500) return { error: "That link is too long." };
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return { error: "Use a full link that starts with https://" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: "Use a link that starts with https:// or http://" };
  if (u.username || u.password) return { error: "Remove the login details from the link." };
  if (!u.hostname.includes(".")) return { error: "That doesn't look like a website address." };
  return { url: u.toString() };
}
