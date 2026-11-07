// Pieces shared by the member and leader views of the portfolio task.
import { useEffect, useRef, useState } from "react";
import { STATUS_LABEL, STEPS, SUBMISSION_LABEL, deadlineTitle, nextDeadline, pendingDeadline, progressOf, timeLeft, toDate } from "../data/portfolio";
import { NOTIFICATION_TEXT, TIMEZONE, ago, fmtDateTime, lang } from "./format";
import { api } from "./session";
import Character from "../components/character/Character";
import { members } from "../data/members";
import { color } from "../lib/palette";

const TONE = {
  not_started: "idle",
  awaiting_initial_review: "wait",
  revisions_requested: "act",
  awaiting_final_review: "wait",
  final_correction_requested: "act",
  completed: "done",
};

/** The status as the site's .tag, in its colour. */
export function Status({ status }) {
  return <span className={`tag pf-status pf-status--${TONE[status]}`}>{STATUS_LABEL[status]}</span>;
}

/** The character of a public member card (by its slug), as on the site. Read-only. */
function MemberCharacter({ memberId }) {
  const m = memberId ? members.find((x) => x.id === memberId) : null;
  if (!m) return <span className="pf-ghost">?</span>;
  return <Character type={m.avatar.char} body={color(m.avatar.body)} wear={m.avatar.wear} />;
}

/** A big character tile, like the member cards: lifted off a dotted bed. */
export function CharacterTile({ memberId, size }) {
  return (
    <span className="pf-tile" style={size ? { "--tile": `${size}px` } : undefined} aria-hidden="true">
      <span className="pf-tile__plate">
        <MemberCharacter memberId={memberId} />
      </span>
    </span>
  );
}

/** A small round character, for lists. */
export function CharacterChip({ memberId, size }) {
  return (
    <span className="pf-chip" style={size ? { "--chip": `${size}px` } : undefined} aria-hidden="true">
      <MemberCharacter memberId={memberId} />
    </span>
  );
}

/** "On time" / "Late", or nothing when there was no deadline. */
export function LateTag({ late }) {
  if (late === null || late === undefined) return null;
  return <span className={`pf-tag pf-tag--${late ? "late" : "ok"}`}>{late ? "Late" : "On time"}</span>;
}

/** A thin line with a stop per step; the current step named underneath. */
export function Progress({ status, compact = false }) {
  const { step, percent } = progressOf(status);
  const done = status === "completed";
  return (
    <div className={`pf-progress${compact ? " pf-progress--compact" : ""}`}>
      <div className="pf-progress__track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Progress: ${STEPS[step]}`}>
        <span className="pf-progress__fill" style={{ width: `${percent}%` }} />
        <span className="pf-progress__stops" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s} className={i < step || done ? "is-done" : i === step ? "is-current" : ""} />
          ))}
        </span>
      </div>
      <div className="pf-progress__label pf-mono">
        <span>
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </span>
        <span className="pf-muted">{percent}%</span>
      </div>
    </div>
  );
}

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const shortTime = new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Every deadline, earliest first, the next upcoming one marked. For the ones that count
 * for a submission it says whether it was sent on time or late; the one the member still
 * owes shows as overdue once it passes. Other dates just count down.
 */
export function DeadlineList({ deadlines, submissions, status }) {
  if (!deadlines.items.length) return <p className="pf-muted">No deadlines yet.</p>;
  const next = nextDeadline(deadlines);
  const pending = pendingDeadline(status, deadlines);
  const sentFor = { initial: submissions.find((s) => s.kind === "initial"), revision: submissions.find((s) => s.kind === "revision") };
  return (
    <ol className="pf-deadlines">
      {deadlines.items.map((d) => {
        const left = timeLeft(d.due);
        const sent = d.counts !== "other" ? sentFor[d.counts] : null;
        const owed = pending === d.due && d.counts !== "other";
        let line;
        if (sent) line = sent.late ? "Submitted late" : sent.late === false ? "Submitted on time" : "Submitted";
        else if (d.counts === "revision" && status === "completed") line = "Not needed";
        else if (left.overdue && !owed) line = "Passed";
        else line = left.text;
        const date = toDate(d.due);
        return (
          <li
            key={d.id}
            className={`pf-deadline${next?.id === d.id ? " is-next" : ""}${left.overdue && owed && !sent ? " is-overdue" : ""}${(left.overdue && !owed) || sent ? " is-past" : ""}`}
          >
            <p className="pf-deadline__date">
              {shortDate.format(date)}
              <small>{shortTime.format(date)}</small>
            </p>
            <div>
              <p className="pf-deadline__title">{deadlineTitle(d)}</p>
              <p className="pf-deadline__left">{line}</p>
              {d.note && <p className="pf-deadline__note">{d.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export const TimezoneNote = () => <p className="pf-muted pf-small">Times in your timezone ({TIMEZONE}).</p>;

/** Every version sent, newest first. */
export function Versions({ submissions }) {
  if (!submissions.length) return <p className="pf-muted">Nothing submitted yet.</p>;
  return (
    <ol className="pf-versions">
      {[...submissions].reverse().map((s) => (
        <li key={s.id}>
          <span className="pf-mono">v{s.version}</span>
          <div>
            <p>
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="pf-link">
                {s.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </p>
            <p className="pf-muted pf-small">
              {SUBMISSION_LABEL[s.kind]} · {fmtDateTime(s.createdAt)} <LateTag late={s.late} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A collapsible section: a title (and count) that opens to its content. */
export function More({ title, count, open = false, children }) {
  return (
    <details className="pf-more" open={open}>
      <summary>
        <span className="pf-more__title">
          {title}
          {count !== undefined && <small>{count}</small>}
        </span>
      </summary>
      <div className="pf-more__body">{children}</div>
    </details>
  );
}

const MESSAGE_KIND = {
  submission: (m) => `Sent v${m.version}`,
  feedback: () => "Feedback",
  revisions: () => "Changes requested",
  approval: () => "Approved",
  comment: () => null,
};

/**
 * The conversation, oldest first. The latest few show; older ones open with a button.
 * Messages from others after `lastReadAt` are marked new. Nothing here can be edited.
 */
export function Thread({ messages, lastReadAt, show = 4 }) {
  const [all, setAll] = useState(false);
  const read = toDate(lastReadAt);
  if (!messages.length) return <p className="pf-muted">No messages yet. Questions are welcome any time.</p>;
  const hidden = all ? 0 : Math.max(0, messages.length - show);
  return (
    <ol className="pf-thread" aria-label="Conversation">
      {hidden > 0 && (
        <li className="pf-earlier">
          <button type="button" className="pf-textbtn" onClick={() => setAll(true)}>
            Show {hidden} earlier {hidden === 1 ? "message" : "messages"}
          </button>
        </li>
      )}
      {messages.slice(hidden).map((m) => {
        const isNew = !m.mine && (!read || toDate(m.createdAt) > read);
        const kind = MESSAGE_KIND[m.kind](m);
        const official = m.authorRole === "leader" && m.kind !== "comment";
        return (
          <li
            key={m.id}
            className={`pf-msg pf-msg--${m.authorRole}${official ? " pf-msg--official" : ""}${m.kind === "approval" ? " pf-msg--approval" : ""}${isNew ? " is-new" : ""}`}
          >
            <div className="pf-msg__meta">
              <strong lang={lang(m.authorName)}>{m.mine ? "You" : m.authorName}</strong>
              <span className="pf-msg__role">{m.authorRole === "leader" ? "Leader" : "Member"}</span>
              <time dateTime={m.createdAt} title={fmtDateTime(m.createdAt)}>
                {ago(m.createdAt)}
              </time>
            </div>
            {kind && <span className="pf-msg__kind">{kind}</span>}
            {m.body ? <p className="pf-msg__body">{m.body}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** A textarea and a send button. `onSend(text)` returns a promise; the box clears on success. */
export function Composer({ onSend, placeholder, label = "Send", extra, maxLength = 2000 }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSend(text.trim());
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="pf-composer" onSubmit={submit}>
      <label className="sr-only" htmlFor="pf-composer">
        {placeholder}
      </label>
      <textarea id="pf-composer" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={2} maxLength={maxLength} />
      <div className="pf-composer__row">
        {extra}
        {text.length > maxLength - 200 && <span className="pf-muted pf-small">{maxLength - text.length} left</span>}
        <button type="submit" className="pf-btn pf-btn--sm" disabled={busy || !text.trim()}>
          {busy ? "Sending…" : label}
        </button>
      </div>
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

/** The bell: unread count, a panel with the latest notifications, mark as read. */
export function Notifications({ unread, onChange, hrefFor }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const box = useRef(null);

  const load = () =>
    api("/portfolio/notifications")
      .then((d) => setItems(d.notifications))
      .catch((e) => setError(e.message));

  useEffect(() => {
    if (open) load();
  }, [open, unread]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (e.key === "Escape" || (e.type === "pointerdown" && !box.current?.contains(e.target))) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  const markRead = async (ids) => {
    await api("/portfolio/notifications/read", { method: "POST", body: ids ? { ids } : {} });
    await load();
    onChange?.();
  };

  return (
    <div className="pf-notify" ref={box}>
      <button type="button" className="pf-bell" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        <BellIcon />
        <span className="sr-only">Notifications{unread ? `, ${unread} unread` : ""}</span>
        {unread > 0 && (
          <span className="pf-bell__count" aria-hidden="true">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="pf-notify__panel" role="dialog" aria-label="Notifications">
          <div className="pf-notify__head">
            <strong>Notifications</strong>
            <button type="button" className="pf-textbtn" onClick={() => markRead()} disabled={!items?.some((n) => !n.read)}>
              Mark all read
            </button>
          </div>
          {error && <p className="pf-error">{error}</p>}
          {!items && !error && <p className="pf-muted pf-small">Loading…</p>}
          {items && !items.length && <p className="pf-muted pf-small">Nothing yet.</p>}
          {items?.length > 0 && (
            <ul className="pf-notify__list">
              {items.map((n) => (
                <li key={n.id} className={n.read ? "is-read" : ""}>
                  <a
                    href={hrefFor(n)}
                    onClick={() => {
                      setOpen(false);
                      if (!n.read) markRead([n.id]);
                    }}
                  >
                    <i className={n.read ? "" : "pf-new"} aria-label={n.read ? undefined : "Unread"} />
                    <span>{NOTIFICATION_TEXT[n.kind]?.(n) ?? n.kind}</span>
                    <time>{ago(n.createdAt)}</time>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Loading / error placeholder for a page. */
export function PageState({ error, onRetry }) {
  if (error)
    return (
      <div className="pf-state">
        <p className="pf-error">{error}</p>
        {onRetry && (
          <button type="button" className="pf-btn" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  return (
    <div className="pf-state" aria-busy="true">
      <span className="pf-spinner" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
