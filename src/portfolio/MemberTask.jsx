// A member's own "Build Your Portfolio" task, top to bottom:
//   hero        their character, name, status, progress, next deadline
//   submit      the portfolio link (+ an optional note)
//   feedback    the leaders' latest word
//   messages    the conversation (latest few; older on request)
//   history     versions, every deadline, what to include (folded)
import { useCallback, useEffect, useState } from "react";
import { checkPortfolioUrl, deadlineTitle, isOverdue, nextDeadline, pendingDeadline, submissionKindFor, submissionsClosed, timeLeft } from "../data/portfolio";
import { fmtDateTime, lang } from "./format";
import { CharacterTile, Composer, DeadlineList, More, PageState, Progress, Status, Thread, TimezoneNote, Versions } from "./parts";
import { api, refreshSession } from "./session";

function useMemberTask() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(
    () =>
      api("/portfolio/me")
        .then((d) => (setData(d), setError(null)))
        .catch((e) => setError(e.message)),
    []
  );
  useEffect(() => {
    load();
  }, [load]);
  return { data, error, load };
}

/** The leaders' latest official word (feedback, changes requested or approval), if any. */
const latestFeedback = (messages) => [...messages].reverse().find((m) => m.authorRole === "leader" && m.kind !== "comment" && m.body);

const NEXT = {
  not_started: { title: "Send your portfolio link.", help: "Have one? Paste it. Starting fresh? Build it, then send it here.", button: "Submit" },
  awaiting_initial_review: { title: "Submitted. The leaders are reviewing it.", help: "Moved your site? Send the new link.", button: "Update link" },
  revisions_requested: { title: "Make the changes, then resubmit.", help: "Same link or a new one.", button: "Resubmit" },
  awaiting_final_review: { title: "Resubmitted. Final review next.", help: "Moved your site? Send the new link.", button: "Update link" },
  final_correction_requested: { title: "One last fix, then you're done.", help: "Same link or a new one.", button: "Resubmit" },
  completed: { title: "Approved. Well done.", help: null, button: null },
};

export default function MemberTask() {
  const { data, error, load } = useMemberTask();

  // Mark the thread read a moment after it's shown, so "New" marks are seen first.
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => api("/portfolio/me/read", { method: "POST", body: {} }).then(refreshSession).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [data]);

  if (!data) return <PageState error={error} onRetry={load} />;
  const { task, deadlines, submissions, messages, lastReadAt, member } = data;
  const status = task.status;
  const feedback = latestFeedback(messages);
  const next = NEXT[status];

  return (
    <div className="pf-page pf-page--narrow">
      <Hero member={member} task={task} deadlines={deadlines} />

      <section className="pf-section" aria-labelledby="pf-submit">
        <p className="eyebrow mono" id="pf-submit">
          {status === "completed" ? "Your portfolio" : "Submit"}
        </p>
        <h2 className="pf-h">{next.title}</h2>
        {next.help && <p className="pf-lede">{next.help}</p>}
        <div style={{ marginTop: 20 }}>
          {status === "completed" ? <Completed task={task} /> : <NextStep task={task} deadlines={deadlines} button={next.button} onDone={load} key={status} />}
        </div>
      </section>

      {feedback && (
        <section className="pf-section" aria-labelledby="pf-feedback">
          <p className="eyebrow mono" id="pf-feedback">
            Latest feedback
          </p>
          <div className={`pf-plate pf-plate--feedback${feedback.kind === "approval" ? " pf-plate--done" : ""}`}>
            <p className="pf-feedback__body">{feedback.body}</p>
            <p className="pf-feedback__by">
              <span lang={lang(feedback.authorName)}>{feedback.authorName}</span> · {fmtDateTime(feedback.createdAt)}
            </p>
          </div>
        </section>
      )}

      <section className="pf-section" aria-labelledby="pf-thread-title" id="pf-thread">
        <p className="eyebrow mono" id="pf-thread-title">
          Conversation
        </p>
        {/* The latest feedback is shown just above; it isn't repeated here. */}
        <Thread messages={feedback ? messages.filter((m) => m.id !== feedback.id) : messages} lastReadAt={lastReadAt} show={4} />
        <Composer
          placeholder="Ask the leaders anything…"
          onSend={async (body) => {
            await api("/portfolio/me/messages", { method: "POST", body: { body } });
            await load();
          }}
        />
      </section>

      <section className="pf-section" aria-labelledby="pf-history">
        <p className="eyebrow mono" id="pf-history">
          History
        </p>
        <More title="Your versions" count={submissions.length}>
          <Versions submissions={submissions} />
        </More>
        <More title="All deadlines" count={deadlines.items.length}>
          <DeadlineList deadlines={deadlines} submissions={submissions} status={status} />
          <p className="pf-muted pf-small" style={{ marginTop: 10 }}>
            {deadlines.closeAfterDeadline ? "Submissions close when their deadline passes." : "Late work is still accepted, marked late."}
          </p>
          <TimezoneNote />
        </More>
        <More title="What to include">
          <ul className="pf-guide">
            <li>A short intro: who you are, what you like building.</li>
            <li>2–3 projects: what they do, the tools, links to code or a demo.</li>
            <li>How to reach you: GitHub, LinkedIn, email.</li>
            <li>A public link that works on a phone.</li>
          </ul>
          <p className="pf-muted pf-small">No portfolio yet? GitHub Pages, Vercel and Netlify host one for free.</p>
        </More>
      </section>
    </div>
  );
}

/** Their character, name, status, progress and the next deadline. */
function Hero({ member, task, deadlines }) {
  const status = task.status;
  const missed = isOverdue(status, deadlines) ? pendingDeadline(status, deadlines) : null;
  const next = status === "completed" ? null : nextDeadline(deadlines);
  return (
    <header className="pf-hero">
      <CharacterTile memberId={member.memberId} />
      <div className="pf-hero__text">
        <p className="pf-hero__name" lang={lang(member.name)}>
          {member.name}
        </p>
        <h1 className="pf-display">
          Build your <em>portfolio.</em>
        </h1>
        <div className="pf-hero__meta">
          <Status status={status} />
          {missed ? (
            <span className="pf-overdue pf-small">Deadline missed · {timeLeft(missed).text.replace("Overdue by ", "")} ago. You can still submit.</span>
          ) : next ? (
            <span className="pf-muted pf-small">
              Next: <strong style={{ color: "var(--fg)", fontWeight: 600 }}>{deadlineTitle(next)}</strong> · {timeLeft(next.due).text}
            </span>
          ) : null}
        </div>
        <Progress status={status} />
      </div>
    </header>
  );
}

function NextStep({ task, deadlines, button, onDone }) {
  const kind = submissionKindFor(task.status);
  const [open, setOpen] = useState(kind !== "update");
  if (submissionsClosed(task.status, deadlines)) {
    return <p className="pf-note">This deadline has passed and submissions are closed. Message the leaders below.</p>;
  }
  if (!open) {
    return (
      <div className="pf-row">
        {task.currentUrl && (
          <a href={task.currentUrl} target="_blank" rel="noopener noreferrer nofollow" className="pf-link">
            {task.currentUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        )}
        <button type="button" className="pf-btn pf-btn--sm" onClick={() => setOpen(true)}>
          {button}
        </button>
      </div>
    );
  }
  return <SubmitForm task={task} button={button} onDone={onDone} onCancel={kind === "update" ? () => setOpen(false) : null} />;
}

function SubmitForm({ task, button, onDone, onCancel }) {
  const [url, setUrl] = useState(task.currentUrl ?? "");
  const [comment, setComment] = useState("");
  const [withNote, setWithNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const checked = checkPortfolioUrl(url);
    if ("error" in checked) return setError(checked.error);
    setBusy(true);
    setError(null);
    try {
      const r = await api("/portfolio/me/submit", { method: "POST", body: { url: checked.url, comment, seq: task.seq } });
      setOk(`Sent${r.late ? " (marked late)" : ""}. The leaders have been notified.`);
      setComment("");
      await onDone();
      refreshSession();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="pf-form" onSubmit={submit} noValidate>
      <div className="pf-row" style={{ alignItems: "flex-end" }}>
        <label className="pf-field" style={{ flex: "1 1 320px" }}>
          <span>Portfolio link</span>
          <input
            type="url"
            inputMode="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-name.github.io"
            aria-invalid={Boolean(error)}
          />
        </label>
        <button type="submit" className="pill pill--solid" disabled={busy}>
          {busy ? "Sending…" : button} <span aria-hidden="true">→</span>
        </button>
      </div>
      {withNote ? (
        <label className="pf-field">
          <span>Note for the leaders (optional)</span>
          <textarea rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What you changed, what was hard, any questions…" autoFocus />
        </label>
      ) : (
        <div className="pf-row">
          <button type="button" className="pf-textbtn" onClick={() => setWithNote(true)}>
            + Add a note
          </button>
          {onCancel && (
            <button type="button" className="pf-textbtn" onClick={onCancel} style={{ color: "var(--muted)" }}>
              Cancel
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
      {ok && (
        <p className="pf-success" role="status">
          {ok}
        </p>
      )}
    </form>
  );
}

function Completed({ task }) {
  return (
    <dl className="pf-facts">
      <div>
        <dt>Approved</dt>
        <dd>
          {fmtDateTime(task.completedAt)}
          <span className="pf-sub">by {task.completedBy}</span>
        </dd>
      </div>
      <div>
        <dt>Your portfolio</dt>
        <dd>
          <a href={task.currentUrl} target="_blank" rel="noopener noreferrer nofollow" className="pf-link">
            {task.currentUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </dd>
      </div>
    </dl>
  );
}
