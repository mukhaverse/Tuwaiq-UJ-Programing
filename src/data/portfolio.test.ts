// The portfolio task's workflow rules (src/data/portfolio.ts). Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NO_DEADLINES,
  checkDeadlines,
  deadlineTitle,
  dueFor,
  nextDeadline,
  readDeadlines,
  type DeadlineItem,
  checkPortfolioUrl,
  isLate,
  isOverdue,
  normalizeEmail,
  normalizeName,
  progressOf,
  statusAfterReview,
  statusAfterSubmit,
  submissionKindFor,
  submissionsClosed,
  timeLeft,
  toDate,
} from "./portfolio.ts";

test("happy path: submit, revisions, resubmit, approve", () => {
  let s = statusAfterSubmit("not_started");
  assert.equal(s, "awaiting_initial_review");
  s = statusAfterReview(s!, "request_revisions", 0);
  assert.equal(s, "revisions_requested");
  assert.equal(submissionKindFor(s!), "revision");
  s = statusAfterSubmit(s!);
  assert.equal(s, "awaiting_final_review");
  s = statusAfterReview(s!, "approve", 0);
  assert.equal(s, "completed");
});

test("an already-good portfolio can be approved at the first review", () => {
  assert.equal(statusAfterReview("awaiting_initial_review", "approve", 0), "completed");
});

test("one final correction, then no more", () => {
  assert.equal(statusAfterReview("awaiting_final_review", "request_revisions", 0), "final_correction_requested");
  assert.equal(submissionKindFor("final_correction_requested"), "correction");
  assert.equal(statusAfterSubmit("final_correction_requested"), "awaiting_final_review");
  assert.equal(statusAfterReview("awaiting_final_review", "request_revisions", 1), null);
  assert.equal(statusAfterReview("awaiting_final_review", "approve", 1), "completed");
});

test("impossible moves are refused", () => {
  assert.equal(statusAfterSubmit("completed"), null);
  assert.equal(statusAfterReview("not_started", "approve", 0), null);
  assert.equal(statusAfterReview("completed", "approve", 0), null);
  assert.equal(statusAfterReview("not_started", "request_revisions", 0), null);
  assert.equal(statusAfterReview("revisions_requested", "request_revisions", 0), null);
});

test("updating the URL while waiting keeps the status", () => {
  assert.equal(submissionKindFor("awaiting_initial_review"), "update");
  assert.equal(statusAfterSubmit("awaiting_initial_review"), "awaiting_initial_review");
  assert.equal(statusAfterSubmit("awaiting_final_review"), "awaiting_final_review");
});

test("progress follows the status, never backwards on the happy path", () => {
  const order = ["not_started", "awaiting_initial_review", "revisions_requested", "awaiting_final_review", "final_correction_requested", "completed"] as const;
  const pct = order.map((s) => progressOf(s).percent);
  assert.deepEqual([...pct].sort((a, b) => a - b), pct);
  assert.equal(progressOf("completed").percent, 100);
  assert.equal(progressOf("not_started").percent, 0);
});

test("database timestamps are read as UTC", () => {
  assert.equal(toDate("2026-11-06 10:00:00")?.toISOString(), "2026-11-06T10:00:00.000Z");
  assert.equal(toDate("2026-11-06T10:00:00.000Z")?.toISOString(), "2026-11-06T10:00:00.000Z");
  assert.equal(toDate(null), null);
  assert.equal(toDate("nonsense"), null);
});

test("late, on time, or no deadline", () => {
  const due = "2026-11-10T20:59:00.000Z";
  assert.equal(isLate(new Date("2026-11-10T20:00:00Z"), due), false);
  assert.equal(isLate(new Date("2026-11-11T00:00:00Z"), due), true);
  assert.equal(isLate(new Date(), null), null);
});

const item = (id: string, due: string, counts: DeadlineItem["counts"], title = ""): DeadlineItem => ({ id, due, counts, title, note: "" });

test("overdue only while the member owes a submission", () => {
  const d = { ...NO_DEADLINES, items: [item("a", "2026-01-01T00:00:00Z", "initial"), item("b", "2026-02-01T00:00:00Z", "revision")] };
  const now = new Date("2026-03-01T00:00:00Z");
  assert.equal(isOverdue("not_started", d, now), true);
  assert.equal(isOverdue("revisions_requested", d, now), true);
  assert.equal(isOverdue("awaiting_initial_review", d, now), false);
  assert.equal(isOverdue("final_correction_requested", d, now), false);
  assert.equal(isOverdue("not_started", NO_DEADLINES, now), false);
});

test("late submissions stay open unless a leader closes them", () => {
  const d = { ...NO_DEADLINES, items: [item("a", "2026-01-01T00:00:00Z", "initial")] };
  const now = new Date("2026-03-01T00:00:00Z");
  assert.equal(submissionsClosed("not_started", d, now), false);
  assert.equal(submissionsClosed("not_started", { ...d, closeAfterDeadline: true }, now), true);
  // The final correction has no deadline of its own, so it's never closed.
  assert.equal(submissionsClosed("final_correction_requested", { ...d, closeAfterDeadline: true }, now), false);
});

test("time left", () => {
  const now = new Date("2026-11-06T00:00:00Z");
  assert.deepEqual(timeLeft("2026-11-16T00:00:00Z", now), { overdue: false, text: "10 days left" });
  assert.equal(timeLeft("2026-11-05T00:00:00Z", now)?.overdue, true);
  assert.equal(timeLeft(null, now), null);
});

test("portfolio links", () => {
  assert.deepEqual(checkPortfolioUrl(" https://me.github.io "), { url: "https://me.github.io/" });
  assert.ok("error" in checkPortfolioUrl("javascript:alert(1)"));
  assert.ok("error" in checkPortfolioUrl("ftp://x.com"));
  assert.ok("error" in checkPortfolioUrl("https://user:pw@x.com"));
  assert.ok("error" in checkPortfolioUrl("https://localhost"));
  assert.ok("error" in checkPortfolioUrl(""));
});

test("emails compare trimmed and lowercased", () => {
  assert.equal(normalizeEmail("  Sara@Example.COM "), "sara@example.com");
});

test("extra dates never make anyone overdue or late", () => {
  const d = { ...NO_DEADLINES, items: [item("x", "2026-01-01T00:00:00Z", "other", "Check-in")] };
  const now = new Date("2026-03-01T00:00:00Z");
  assert.equal(isOverdue("not_started", d, now), false);
  assert.equal(dueFor(d, "initial"), null);
  assert.equal(submissionsClosed("not_started", { ...d, closeAfterDeadline: true }, now), false);
});

test("the old two-deadline setting still reads, as two deadlines that count the same way", () => {
  const d = readDeadlines({ initialDue: "2026-12-01T18:00:00.000Z", revisedDue: "2026-12-15T18:00:00.000Z", closeAfterDeadline: true });
  assert.equal(d.items.length, 2);
  assert.equal(dueFor(d, "initial"), "2026-12-01T18:00:00.000Z");
  assert.equal(dueFor(d, "revision"), "2026-12-15T18:00:00.000Z");
  assert.equal(d.closeAfterDeadline, true);
  assert.deepEqual(readDeadlines({ initialDue: null, revisedDue: null, closeAfterDeadline: false }), NO_DEADLINES);
  assert.deepEqual(readDeadlines(undefined), NO_DEADLINES);
});

test("the new setting reads sorted, dropping broken entries", () => {
  const d = readDeadlines({
    items: [item("b", "2026-12-20T00:00:00Z", "other"), { id: "bad", due: "nope" }, item("a", "2026-12-01T00:00:00Z", "initial")],
    closeAfterDeadline: false,
  });
  assert.deepEqual(d.items.map((x) => x.id), ["a", "b"]);
});

test("next upcoming deadline", () => {
  const d = { ...NO_DEADLINES, items: [item("a", "2026-01-01T00:00:00Z", "initial"), item("b", "2026-05-01T00:00:00Z", "other"), item("c", "2026-04-01T00:00:00Z", "revision")] };
  assert.equal(nextDeadline(d, new Date("2026-03-01T00:00:00Z"))?.id, "c");
  assert.equal(nextDeadline(d, new Date("2026-06-01T00:00:00Z")), null);
});

test("deadline rules", () => {
  assert.equal(checkDeadlines([item("a", "2026-01-01T00:00:00Z", "other"), item("b", "2026-01-02T00:00:00Z", "other")]), null);
  assert.match(checkDeadlines([item("a", "2026-01-01T00:00:00Z", "initial"), item("b", "2026-01-02T00:00:00Z", "initial")])!, /Only one/);
  assert.match(checkDeadlines([item("a", "2026-02-01T00:00:00Z", "initial"), item("b", "2026-01-01T00:00:00Z", "revision")])!, /after the initial/);
  assert.match(checkDeadlines([item("a", "2026-01-01T00:00:00Z", "other"), item("a", "2026-01-02T00:00:00Z", "other")])!, /same id/);
  assert.equal(deadlineTitle(item("a", "2026-01-01T00:00:00Z", "initial")), "Initial submission");
  assert.equal(deadlineTitle(item("a", "2026-01-01T00:00:00Z", "other", "Showcase")), "Showcase");
});

test("names match ignoring case and extra spaces, nothing else", () => {
  assert.equal(normalizeName("  Sara   Ahmed "), normalizeName("sara ahmed"));
  assert.equal(normalizeName("شموخ  مشاري   الشريف"), normalizeName("شموخ مشاري الشريف"));
  assert.notEqual(normalizeName("Sara Ahmed"), normalizeName("Sarah Ahmed"));
});
