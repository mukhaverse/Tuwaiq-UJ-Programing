// Dates and labels for the portfolio pages. Times are stored in UTC and shown in the
// viewer's own timezone (named on screen, so nobody misreads a deadline).
import { toDate } from "../data/portfolio";

export const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const dateTime = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const fmtDateTime = (v) => {
  const d = toDate(v);
  return d ? dateTime.format(d) : "—";
};

const dayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

/** "6 Nov": for tight table cells (pair it with a title holding the full date). */
export const fmtShort = (v) => {
  const d = toDate(v);
  return d ? dayMonth.format(d) : "—";
};

export const fmtDate = (v) => {
  const d = toDate(v);
  return d ? dateOnly.format(d) : "—";
};

/** "3 min ago", "2 days ago"… falling back to the date after a week. */
export function ago(v, now = Date.now()) {
  const d = toDate(v);
  if (!d) return "—";
  const s = Math.round((now - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} day${s < 172800 ? "" : "s"} ago`;
  return dateOnly.format(d);
}

/** An ISO instant → the value of an <input type="datetime-local"> in this timezone. */
export function toLocalInput(iso) {
  const d = toDate(iso);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The reverse: a datetime-local value (read in this timezone) → an ISO instant, or null. */
export function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const NOTIFICATION_TEXT = {
  submitted: (n) => `${n.memberName} submitted their portfolio`,
  resubmitted: (n) => `${n.memberName} resubmitted their portfolio`,
  url_updated: (n) => `${n.memberName} updated their portfolio link`,
  member_comment: (n) => `${n.memberName} wrote a message`,
  feedback: (n) => `${n.actorName} left feedback on your portfolio`,
  reply: (n) => `${n.actorName} replied to you`,
  revisions_requested: (n) => `${n.actorName} asked for revisions`,
  reviewed: (n) => `${n.actorName} asked for one last fix`,
  approved: (n) => `${n.actorName} approved your portfolio`,
};

/** "ar" for Arabic names, so they get the Arabic font (and direction). */
export const lang = (s) => (/[؀-ۿ]/.test(s ?? "") ? "ar" : undefined);
