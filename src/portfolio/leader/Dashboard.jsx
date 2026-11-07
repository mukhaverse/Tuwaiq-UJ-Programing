// Leaders: the portfolio task at a glance. What needs you first (reviews waiting, new
// messages), five numbers, then every member with filters and sorting. Opening a
// member goes to their review page.
import { useCallback, useEffect, useMemo, useState } from "react";
import { deadlineTitle, isOverdue, nextDeadline, pendingDeadline, timeLeft, toDate } from "../../data/portfolio";
import { NOTIFICATION_TEXT, ago, fmtDateTime, lang } from "../format";
import { CharacterChip, More, PageState, Progress, Status } from "../parts";
import { api } from "../session";

const waiting = (r) => r.status === "awaiting_initial_review" || r.status === "awaiting_final_review";
const changes = (r) => r.status === "revisions_requested" || r.status === "final_correction_requested";

const FILTERS = [
  { id: "all", label: "All", test: () => true },
  { id: "review", label: "To review", test: waiting },
  { id: "not_started", label: "Not started", test: (r) => r.status === "not_started" },
  { id: "revisions", label: "Making changes", test: changes },
  { id: "completed", label: "Completed", test: (r) => r.status === "completed" },
  { id: "overdue", label: "Overdue", test: (r) => r.overdue },
  { id: "comments", label: "New messages", test: (r) => r.newComment },
];

const SORTS = {
  activity: { label: "Latest activity", fn: (a, b) => (toDate(b.lastActivityAt)?.getTime() ?? 0) - (toDate(a.lastActivityAt)?.getTime() ?? 0) },
  submitted: { label: "Submitted", fn: (a, b) => (toDate(b.revisedAt ?? b.initialAt)?.getTime() ?? 0) - (toDate(a.revisedAt ?? a.initialAt)?.getTime() ?? 0) },
  // Overdue first, then the nearest pending deadline, then members not waiting on one.
  deadline: { label: "Deadline", fn: (a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity) },
  name: { label: "Name", fn: (a, b) => a.name.localeCompare(b.name) },
};

function useOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(
    () =>
      api("/portfolio/leader/overview")
        .then((d) => (setData(d), setError(null)))
        .catch((e) => setError(e.message)),
    []
  );
  useEffect(() => {
    load();
  }, [load]);
  return { data, error, load };
}

export default function Dashboard() {
  const { data, error, load } = useOverview();
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("activity");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    if (!data) return [];
    return data.rows.map((r) => {
      const due = pendingDeadline(r.status, data.deadlines);
      return { ...r, overdue: isOverdue(r.status, data.deadlines), due, dueAt: toDate(due)?.getTime() ?? null };
    });
  }, [data]);

  if (!data) return <PageState error={error} onRetry={load} />;

  if (!data.rows.length) {
    return (
      <div className="pf-page pf-page--narrow">
        <p className="eyebrow mono">Leaders</p>
        <h1 className="pf-display">
          No members <em>yet.</em>
        </h1>
        <p className="pf-lede">Import the official roster so members can sign in.</p>
        <p style={{ marginTop: 28 }}>
          <a href="#portfolio/access" className="pill pill--solid">
            Import roster →
          </a>
        </p>
      </div>
    );
  }

  const active = rows.filter((r) => r.active);
  const paused = rows.filter((r) => !r.active);
  const count = (fn) => active.filter(fn).length;
  // Longest-waiting first: reviews, then unanswered messages.
  const attention = active
    .filter((r) => waiting(r) || r.newComment)
    .sort((a, b) => (waiting(b) - waiting(a)) || (toDate(a.lastActivityAt)?.getTime() ?? 0) - (toDate(b.lastActivityAt)?.getTime() ?? 0));
  const numbers = [
    { label: "Members", value: active.length, filter: "all" },
    { label: "To review", value: count(waiting), filter: "review", tone: "hot" },
    { label: "Making changes", value: count(changes), filter: "revisions" },
    { label: "Completed", value: count((r) => r.status === "completed"), filter: "completed" },
    { label: "Overdue", value: count((r) => r.overdue), filter: "overdue", tone: "warn" },
  ];
  const tabs = paused.length ? [...FILTERS, { id: "paused", label: "Paused", test: () => true }] : FILTERS;
  const f = tabs.find((x) => x.id === filter) ?? FILTERS[0];
  const pool = filter === "paused" ? paused : active;
  const q = query.trim().toLowerCase();
  const shown = pool.filter(f.test).filter((r) => !q || r.name.toLowerCase().includes(q)).sort(SORTS[sort].fn);
  const next = nextDeadline(data.deadlines);

  return (
    <div className="pf-page">
      <header className="pf-head">
        <div>
          <p className="eyebrow mono">Leaders · Build your portfolio</p>
          <h1 className="pf-display">
            Portfolio <em>reviews.</em>
          </h1>
          <p className="pf-lede">
            <strong>{count((r) => r.initialAt)}</strong> of {active.length} submitted · <strong>{count((r) => r.revisedAt)}</strong> revised ·{" "}
            <strong>{data.unread}</strong> unread
          </p>
        </div>
        <dl className="pf-facts">
          <div>
            <dt>Next deadline</dt>
            <dd>
              {next ? (
                <>
                  {deadlineTitle(next)}
                  <span className="pf-sub">{timeLeft(next.due).text}</span>
                </>
              ) : (
                <span className="pf-muted">None upcoming</span>
              )}
              <a href="#portfolio/deadlines" className="pf-btn pf-btn--sm" style={{ marginTop: 10, justifySelf: "start" }}>
                Manage
              </a>
            </dd>
          </div>
        </dl>
      </header>

      <ul className="pf-numbers" aria-label="Summary">
        {numbers.map((n) => (
          <li key={n.label} className={n.tone && n.value ? `is-${n.tone}` : ""}>
            <button type="button" onClick={() => (setFilter(n.filter), document.getElementById("pf-members")?.scrollIntoView({ behavior: "smooth" }))} aria-pressed={filter === n.filter}>
              <strong>{n.value}</strong>
              <span>{n.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <section className="pf-section" aria-labelledby="pf-attn" style={{ marginTop: 28 }}>
        <div className="pf-section__head">
          <p className="eyebrow mono" id="pf-attn">
            Needs you
          </p>
          <span className="pf-muted pf-small">{attention.length ? `${attention.length} waiting` : ""}</span>
        </div>
        {attention.length ? (
          <ol className="pf-rows pf-attn">
            {attention.map((r) => (
              <li key={r.id}>
                <a href={`#portfolio/m/${r.id}`}>
                  <CharacterChip memberId={r.memberId} size={40} />
                  <span className="pf-attn__name" lang={lang(r.name)}>
                    {r.name}
                  </span>
                  <span className="pf-attn__why">
                    {r.status === "awaiting_initial_review" ? "First review" : r.status === "awaiting_final_review" ? "Final review" : "New message"}
                    {r.lastActivityAt && <span className="pf-muted"> · {ago(r.lastActivityAt)}</span>}
                  </span>
                  <span className={`pf-btn pf-btn--sm`}>{waiting(r) ? "Review" : "Open"}</span>
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="pf-muted">All caught up. Nothing waiting for a review or a reply.</p>
        )}
      </section>

      <section className="pf-section" aria-labelledby="pf-members">
        <p className="eyebrow mono" id="pf-members">
          All members
        </p>

        <div className="pf-keys" role="group" aria-label="Filter">
          {tabs.map((x) => (
            <button key={x.id} type="button" className="pf-key" aria-pressed={filter === x.id} onClick={() => setFilter(x.id)}>
              {x.label}
              <sup>{x.id === "paused" ? paused.length : active.filter(x.test).length}</sup>
            </button>
          ))}
        </div>

        <div className="pf-toolbar">
          <span className="pf-muted pf-small">{shown.length} shown</span>
          <div className="pf-row">
            <input type="search" className="pf-search" placeholder="Search" aria-label="Search names" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              {Object.entries(SORTS).map(([id, s]) => (
                <option key={id} value={id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!shown.length ? (
          <p className="pf-empty">Nobody here.</p>
        ) : (
          <div className="pf-table-wrap">
            <table className="pf-table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Status</th>
                  <th scope="col">Progress</th>
                  <th scope="col">Portfolio</th>
                  <th scope="col">Deadline</th>
                  <th scope="col">Activity</th>
                  <th scope="col">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <Row key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div>
        <RecentActivity unread={data.unread} />
        <SignIns />
      </div>
    </div>
  );
}

function Row({ r }) {
  const href = `#portfolio/m/${r.id}`;
  const left = r.due ? timeLeft(r.due) : null;
  const late = r.revisedLate ?? r.initialLate;
  return (
    <tr className={r.active ? "" : "is-inactive"}>
      <th scope="row">
        <a href={href} className="pf-member">
          <CharacterChip memberId={r.memberId} size={40} />
          <span>
            <span className="pf-member__name" lang={lang(r.name)}>
              {r.name}
            </span>{" "}
            {(r.newComment || r.unread > 0) && <span className="pf-new" aria-label="New activity" />}
            {(!r.linked || !r.active) && <span className="pf-member__meta">{!r.active ? "Access paused" : "Not signed in yet"}</span>}
          </span>
        </a>
      </th>
      <td data-label="Status">
        <Status status={r.status} />
      </td>
      <td data-label="Progress">
        <Progress status={r.status} compact />
      </td>
      <td data-label="Portfolio">
        {r.currentUrl ? (
          <a href={r.currentUrl} target="_blank" rel="noopener noreferrer nofollow" className="pf-link pf-url" title={r.currentUrl}>
            {r.currentUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        ) : (
          <span className="pf-muted">—</span>
        )}
      </td>
      <td data-label="Deadline" className="pf-nowrap">
        {left ? (
          <span className={left.overdue ? "pf-overdue" : ""}>{left.text}</span>
        ) : late !== null && late !== undefined ? (
          <span className={`pf-tag pf-tag--${late ? "late" : "ok"}`}>{late ? "Sent late" : "On time"}</span>
        ) : (
          <span className="pf-muted">—</span>
        )}
      </td>
      <td data-label="Activity" className="pf-nowrap pf-muted">
        {r.lastActivityAt ? ago(r.lastActivityAt) : "—"}
      </td>
      <td className="pf-go">
        <a href={href} className="pf-btn pf-btn--sm" style={waiting(r) ? { borderColor: "var(--cyan)" } : undefined}>
          {waiting(r) ? "Review" : "Open"}
        </a>
        <a href={href} className="pf-chev" aria-label={`Open ${r.name}`}>
          →
        </a>
      </td>
    </tr>
  );
}

function RecentActivity({ unread }) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    api("/portfolio/notifications")
      .then((d) => setItems(d.notifications.slice(0, 12)))
      .catch(() => setItems([]));
  }, [unread]);
  return (
    <More title="Recent activity" count={items ? items.length : undefined}>
      {!items ? (
        <p className="pf-muted">Loading…</p>
      ) : !items.length ? (
        <p className="pf-muted">Nothing yet.</p>
      ) : (
        <ul className="pf-activity">
          {items.map((n) => (
            <li key={n.id}>
              <a href={`#portfolio/m/${n.rosterId}`}>
                {!n.read && <span className="pf-new" style={{ marginInlineEnd: 10 }} aria-label="Unread" />}
                {NOTIFICATION_TEXT[n.kind]?.(n)}
              </a>
              <time>{ago(n.createdAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </More>
  );
}

/** Every member sign-in by email (and the misses), newest first. Leaders only. */
function SignIns() {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || items) return;
    api("/portfolio/leader/signins")
      .then((d) => setItems(d.signins))
      .catch(() => setItems([]));
  }, [open, items]);
  return (
    <details className="pf-more" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="pf-more__title">Sign-ins</span>
      </summary>
      <div className="pf-more__body">
        {!items ? (
          <p className="pf-muted">Loading…</p>
        ) : !items.length ? (
          <p className="pf-muted">No sign-ins yet.</p>
        ) : (
          <ul className="pf-activity">
            {items.map((s) => (
              <li key={s.id} className={s.ok ? "" : "is-problem"}>
                <span>
                  {s.ok ? (
                    <a href={`#portfolio/m/${s.rosterId}`} lang={lang(s.name)}>
                      {s.name}
                    </a>
                  ) : (
                    <strong>Not found</strong>
                  )}
                  <span className="pf-muted"> · {s.email}</span>
                </span>
                <time title={fmtDateTime(s.createdAt)}>{ago(s.createdAt)}</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
