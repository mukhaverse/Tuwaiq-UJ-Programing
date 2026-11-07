// Leaders: one member's portfolio task. Their portfolio and where they are, the review
// decision, the conversation; versions, deadlines, dates and history folded at the side.
import { useCallback, useEffect, useState } from "react";
import { MAX_CORRECTIONS, STATUS_LABEL, isOverdue, pendingDeadline, statusAfterReview, timeLeft } from "../../data/portfolio";
import { fmtDateTime, lang } from "../format";
import { CharacterTile, Composer, DeadlineList, LateTag, More, PageState, Progress, Status, Thread, TimezoneNote, Versions } from "../parts";
import { api, refreshSession } from "../session";

export default function Review({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(
    () =>
      api(`/portfolio/leader/tasks/${id}`)
        .then((d) => (setData(d), setError(null)))
        .catch((e) => setError(e.message)),
    [id]
  );
  useEffect(() => {
    load();
  }, [load]);

  // Opening a member marks their thread and notifications read, for this leader only.
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => api(`/portfolio/leader/tasks/${id}/read`, { method: "POST", body: {} }).then(refreshSession).catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, [data, id]);

  if (!data) return <PageState error={error} onRetry={load} />;
  const { member, task, submissions, messages, events, deadlines, lastReadAt } = data;
  const latest = submissions.at(-1);
  const due = pendingDeadline(task.status, deadlines);
  const left = timeLeft(due);
  const overdue = isOverdue(task.status, deadlines);

  return (
    <div className="pf-page">
      <a href="#portfolio" className="pf-textbtn pf-small">
        ← All members
      </a>
      <header className="pf-hero" style={{ marginTop: 24 }}>
        <CharacterTile memberId={member.memberId} size={120} />
        <div className="pf-hero__text">
          <p className="pf-hero__name">
            Portfolio review
            {!member.active && " · access paused"}
          </p>
          <h1 className="pf-display pf-display--md" lang={lang(member.name)}>
            {member.name}
          </h1>
          <div className="pf-hero__meta">
            <Status status={task.status} />
            {left && <span className={`pf-small ${overdue ? "pf-overdue" : "pf-muted"}`}>{left.text}</span>}
          </div>
        </div>
      </header>

      <div className="pf-grid">
        <div>
          <section className="pf-section" aria-labelledby="pf-portfolio">
            <div className="pf-section__head">
              <p className="eyebrow mono" id="pf-portfolio">
                Portfolio
              </p>
            </div>
            <Progress status={task.status} />
            {latest ? (
              <div style={{ display: "grid", gap: 8, marginTop: 22 }}>
                <a href={latest.url} target="_blank" rel="noopener noreferrer nofollow" className="pf-h pf-link" style={{ fontSize: "clamp(1.2rem, 2.6vw, 1.6rem)" }}>
                  {latest.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
                </a>
                <p className="pf-muted pf-small">
                  v{latest.version} · {fmtDateTime(latest.createdAt)} <LateTag late={latest.late} />
                </p>
              </div>
            ) : (
              <p className="pf-muted" style={{ marginTop: 22 }}>
                Nothing submitted yet.
              </p>
            )}
          </section>

          <Decision id={id} task={task} onDone={load} />

          <section className="pf-section" aria-labelledby="pf-conv">
            <div className="pf-section__head">
              <p className="eyebrow mono" id="pf-conv">
                Conversation
              </p>
            </div>
            <Thread messages={messages} lastReadAt={lastReadAt} show={5} />
            <LeaderComposer id={id} onDone={load} />
          </section>
        </div>

        <aside className="pf-aside" aria-label="Details">
          <More title="Versions" count={submissions.length} open>
            <Versions submissions={submissions} />
          </More>
          <More title="Deadlines" count={deadlines.items.length}>
            <DeadlineList deadlines={deadlines} submissions={submissions} status={task.status} />
            <TimezoneNote />
          </More>
          <More title="Member">
            <dl className="pf-dl">
              <dt>Account</dt>
              <dd>{member.accountName ? `${member.accountName}, since ${fmtDateTime(member.linkedAt)}` : "Not signed up"}</dd>
              <dt>First sent</dt>
              <dd>{fmtDateTime(task.initialAt)}</dd>
              <dt>Revised</dt>
              <dd>{fmtDateTime(task.revisedAt)}</dd>
              <dt>Approved</dt>
              <dd>{task.completedAt ? `${fmtDateTime(task.completedAt)} · ${task.completedBy}` : "—"}</dd>
            </dl>
          </More>
          <More title="History" count={events.length}>
            {!events.length ? (
              <p className="pf-muted">No activity yet.</p>
            ) : (
              <ol className="pf-events">
                {[...events].reverse().map((e) => (
                  <li key={e.seq}>
                    <strong lang={lang(e.actorName)}>{e.actorName}</strong>{" "}
                    {e.kind === "submitted" ? (e.fromStatus === e.toStatus ? "updated the link" : "submitted") : e.kind === "approved" ? "approved" : "requested changes"}
                    {e.fromStatus !== e.toStatus && <span className="pf-muted"> → {STATUS_LABEL[e.toStatus]}</span>}
                    <br />
                    <time className="pf-muted pf-small">{fmtDateTime(e.createdAt)}</time>
                  </li>
                ))}
              </ol>
            )}
          </More>
        </aside>
      </div>
    </div>
  );
}

/** Request changes / approve, with the feedback the member will see. */
function Decision({ id, task, onDone }) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(null);
  const canRevise = statusAfterReview(task.status, "request_revisions", task.corrections) !== null;
  const canApprove = statusAfterReview(task.status, "approve", task.corrections) !== null;
  const waiting = task.status === "awaiting_initial_review" || task.status === "awaiting_final_review";

  const head = (
    <div className="pf-section__head">
      <p className="eyebrow mono" id="pf-decision">
        {task.status === "awaiting_final_review" ? "Final review" : "Review"}
      </p>
    </div>
  );

  if (task.status === "completed" || task.status === "not_started") {
    return (
      <section className="pf-section" aria-labelledby="pf-decision">
        {head}
        <p className="pf-h" style={{ color: task.status === "completed" ? "var(--ok)" : "var(--muted)" }}>
          {task.status === "completed" ? "Approved." : "Nothing to review yet."}
        </p>
        {task.status === "completed" && (
          <p className="pf-muted" style={{ marginTop: 10 }}>
            By {task.completedBy}, {fmtDateTime(task.completedAt)}
          </p>
        )}
        {ok && (
          <p className="pf-success" role="status" style={{ marginTop: 16 }}>
            {ok}
          </p>
        )}
      </section>
    );
  }

  const act = async (action) => {
    if (action === "request_revisions" && !feedback.trim()) return setError("Write what needs to change first.");
    setBusy(action);
    setError(null);
    try {
      await api(`/portfolio/leader/tasks/${id}/review`, { method: "POST", body: { action, feedback, seq: task.seq } });
      setOk(action === "approve" ? "Approved. The member has been notified." : "Sent. The member has been notified.");
      setFeedback("");
      await onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="pf-section pf-decision" aria-labelledby="pf-decision">
      {head}
      {!waiting && <p className="pf-muted">Waiting for them to resubmit. You can still approve now.</p>}
      {task.status === "awaiting_final_review" && !canRevise && (
        <p className="pf-note">The final correction ({MAX_CORRECTIONS}) was used. Approve, or reply below.</p>
      )}
      <label className="pf-field">
        <span>Feedback{canRevise ? "" : " (optional)"}</span>
        <textarea
          rows={5}
          maxLength={4000}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={canRevise ? "What's good, and what to change…" : "A few words for them (optional)…"}
        />
      </label>
      <div className="pf-row">
        {canApprove && (
          <button type="button" className="pill pill--accent" disabled={Boolean(busy)} onClick={() => act("approve")}>
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
        )}
        {canRevise && (
          <button type="button" className="pf-btn" disabled={Boolean(busy)} onClick={() => act("request_revisions")}>
            {busy === "request_revisions" ? "Sending…" : task.status === "awaiting_final_review" ? "Ask for one last fix" : "Request changes"}
          </button>
        )}
      </div>
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
    </section>
  );
}

function LeaderComposer({ id, onDone }) {
  const [kind, setKind] = useState("comment");
  return (
    <Composer
      placeholder={kind === "feedback" ? "Official feedback (doesn't change the status)…" : "Reply…"}
      label={kind === "feedback" ? "Send feedback" : "Send"}
      maxLength={4000}
      extra={
        <label className="pf-check pf-small pf-muted">
          <input type="checkbox" checked={kind === "feedback"} onChange={(e) => setKind(e.target.checked ? "feedback" : "comment")} /> Mark as feedback
        </label>
      }
      onSend={async (body) => {
        await api(`/portfolio/leader/tasks/${id}/messages`, { method: "POST", body: { body, kind } });
        await onDone();
      }}
    />
  );
}
