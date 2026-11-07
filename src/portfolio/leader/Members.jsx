// Leaders: the official roster and who's signed up. Import the registration sheet
// (.xlsx or .csv, read in the browser and never uploaded as a file), add one member,
// see linked accounts and sign-up problems, unlink a lost account, pause access.
import { useCallback, useEffect, useMemo, useState } from "react";
import { readSheet } from "../../admin/survey/sheet";
import { normalizeEmail } from "../../data/portfolio";
import { ago, fmtDateTime, lang as ar } from "../format";
import { CharacterChip, PageState } from "../parts";
import { members as publicMembers } from "../../data/members";
import { api } from "../session";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EVENT_TEXT = {
  linked: "Signed up and linked",
  unlinked: "Account unlinked",
  blocked: "Access paused",
  unblocked: "Access restored",
  not_on_roster: "Email not on the roster",
  already_linked: "Tried to claim an already-linked member",
  wrong_code: "Wrong code",
  too_many_tries: "Too many wrong codes",
  email_failed: "Code email failed to send",
  several_matches: "Email matches more than one member",
  github_set: "GitHub account set by a leader",
  github_cleared: "GitHub account removed",
  character_set: "Character linked",
};
const PROBLEMS = new Set(["not_on_roster", "already_linked", "too_many_tries", "email_failed", "several_matches"]);

export default function Members() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("members");
  const [notice, setNotice] = useState(null);
  const load = useCallback(
    () =>
      api("/portfolio/leader/access")
        .then((d) => (setData(d), setError(null)))
        .catch((e) => setError(e.message)),
    []
  );
  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <PageState error={error} onRetry={load} />;
  const problems = data.events.filter((e) => PROBLEMS.has(e.kind));
  const linked = data.members.filter((m) => m.accountName).length;

  return (
    <div className="pf-page">
      <header className="pf-head">
        <div>
          <p className="eyebrow mono">Leaders · Private</p>
          <h1 className="pf-display">
            The <em>roster.</em>
          </h1>
          <p className="pf-lede">
            <strong>{linked}</strong> of {data.members.length} have signed in. Members sign in with the email they registered with; it has to match the one here.
          </p>
        </div>
      </header>
      <div className="pf-tabs" role="tablist" aria-label="Sections" style={{ marginBottom: 28 }}>
        {[
          ["members", "Members", data.members.length],
          ["import", "Import", null],
          ["problems", "Problems", problems.length],
          ["log", "Log", null],
        ].map(([id, label, n]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className="pf-key" onClick={() => setTab(id)}>
            {label}
            {n !== null && <sup>{n}</sup>}
          </button>
        ))}
      </div>
      {tab === "members" && notice && (
        <p className="pf-success" role="status" style={{ marginBottom: 14 }}>
          {notice}
        </p>
      )}
      {tab === "members" && <Characters members={data.members} />}
      {tab === "members" && <RosterList members={data.members} onChange={load} />}
      {tab === "import" && <Import existing={data.members} onDone={(text) => (load(), setNotice(text), setTab("members"))} />}
      {tab === "problems" && <EventList events={problems} empty="No problems so far." />}
      {tab === "log" && <EventList events={data.events} empty="Nothing yet." />}
    </div>
  );
}

function RosterList({ members, onChange }) {
  const [q, setQ] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const query = q.trim().toLowerCase();
  const shown = members.filter((m) => !query || m.name.toLowerCase().includes(query) || m.email.includes(query));

  const run = async (key, path, body, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(key);
    setError(null);
    try {
      await api(path, { method: "POST", body });
      await onChange();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section>
      <div className="pf-toolbar">
        <input type="search" className="pf-search" placeholder="Search" aria-label="Search names or emails" value={q} onChange={(e) => setQ(e.target.value)} />
        <AddOne onDone={onChange} />
      </div>
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
      {!members.length ? (
        <p className="pf-empty">Empty. Use Import to add the registration sheet.</p>
      ) : (
        <div className="pf-table-wrap">
          <table className="pf-table">
            <thead>
              <tr>
                <th scope="col">Member</th>
                <th scope="col">Character</th>
                <th scope="col">Signed in</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id} className={m.active ? "" : "is-inactive"}>
                  <th scope="row">
                    <a href={`#portfolio/m/${m.id}`} className="pf-member">
                      <CharacterChip memberId={m.memberId} size={36} />
                      <span>
                        <span className="pf-member__name" lang={ar(m.name)}>
                          {m.name}
                        </span>
                        <span className="pf-member__meta">
                          {m.email}
                          {!m.active && " · paused"}
                        </span>
                      </span>
                    </a>
                  </th>
                  <td data-label="Character">
                    {m.memberId ? (
                      <span className="pf-muted pf-small" lang={ar(cardName(m.memberId))}>
                        {cardName(m.memberId)}
                      </span>
                    ) : (
                      <span className="pf-overdue pf-small">No match</span>
                    )}
                  </td>
                  <td data-label="Signed in">
                    {m.accountName ? <span className="pf-small">{fmtDateTime(m.linkedAt)}</span> : <span className="pf-muted pf-small">Not yet</span>}
                  </td>
                  <td>
                    <div className="pf-actions">
                    {m.accountName && (
                      <button
                        type="button"
                        className="pf-textbtn pf-small"
                        disabled={busy === `u${m.id}`}
                        onClick={() =>
                          run(
                            `u${m.id}`,
                            `/portfolio/leader/roster/${m.id}/unlink`,
                            {},
                            `Sign ${m.name} out everywhere? They keep all their portfolio history and can sign in again with their email.`
                          )
                        }
                      >
                        Sign out
                      </button>
                    )}
                    <button
                      type="button"
                      className={`pf-textbtn pf-small${m.active ? " pf-textbtn--danger" : ""}`}
                      disabled={busy === `a${m.id}`}
                      onClick={() =>
                        run(
                          `a${m.id}`,
                          `/portfolio/leader/roster/${m.id}/active`,
                          { active: !m.active },
                          m.active ? `Pause ${m.name}'s access? They can't open their task or sign up until you restore it.` : null
                        )
                      }
                    >
                      {m.active ? "Pause" : "Restore"}
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** The public member card's name, for a roster entry's matched character. */
const cardName = (id) => publicMembers.find((p) => p.id === id)?.name ?? id;

/**
 * How many roster entries were matched to a member card (by exact name, ignoring case and
 * extra spaces) and which weren't. Unmatched members show a "?" instead of a character;
 * fixing the spelling on either side makes them match on the next load.
 */
function Characters({ members }) {
  const missing = members.filter((m) => !m.memberId);
  return (
    <div className={missing.length ? "pf-note" : "pf-success"} style={{ marginBottom: 20 }}>
      <strong>
        {members.length - missing.length} of {members.length}
      </strong>{" "}
      matched to a member card by name.
      {missing.length > 0 && (
        <>
          {" "}
          No match: {missing.map((m, i) => (
            <span key={m.id}>
              {i > 0 && ", "}
              <span lang={ar(m.name)}>{m.name}</span>
            </span>
          ))}
          .
        </>
      )}
    </div>
  );
}

function AddOne({ onDone }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <button type="button" className="pf-btn pf-btn--sm" onClick={() => setOpen(true)}>
        + Add member
      </button>
    );
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/portfolio/leader/roster", { method: "POST", body: { name, email } });
      setName("");
      setEmail("");
      setOpen(false);
      await onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="pf-row pf-addone" onSubmit={submit}>
      <input required placeholder="Full name" aria-label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
      <input required type="email" placeholder="Registered email" aria-label="Registered email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="submit" className="pill pill--solid" disabled={busy}>
        Add
      </button>
      <button type="button" className="pf-textbtn" onClick={() => setOpen(false)}>
        Cancel
      </button>
      {error && <p className="pf-error">{error}</p>}
    </form>
  );
}

/** Guess which columns hold the name and the email. */
function guess(headers, rows) {
  const email =
    headers.find((h) => /e-?mail|البريد/i.test(h)) ?? headers.find((h) => rows.slice(0, 20).filter((r) => EMAIL.test(r[h] ?? "")).length >= Math.min(3, rows.length));
  const name = headers.find((h) => h !== email && /name|الاسم|اسم/i.test(h)) ?? headers.find((h) => h !== email);
  return { name: name ?? "", email: email ?? "" };
}

function Import({ existing, onDone }) {
  const [sheet, setSheet] = useState(null);
  const [cols, setCols] = useState({ name: "", email: "" });
  const [deactivate, setDeactivate] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const pick = async (file) => {
    setError(null);
    setResult(null);
    try {
      const s = await readSheet(file);
      if (!s.rows.length) throw new Error("No rows found in that file.");
      setSheet({ ...s, fileName: file.name });
      setCols(guess(s.headers, s.rows));
    } catch (e) {
      setError(e.message);
    }
  };

  const check = useMemo(() => {
    if (!sheet || !cols.name || !cols.email) return null;
    const known = new Map(existing.map((m) => [m.email, m]));
    const seen = new Map();
    const ok = [];
    const problems = [];
    sheet.rows.forEach((r, i) => {
      const name = (r[cols.name] ?? "").trim().replace(/\s+/g, " ");
      const raw = (r[cols.email] ?? "").trim();
      const email = normalizeEmail(raw);
      const line = i + 2;
      if (!name && !raw) return;
      if (!raw) return problems.push({ line, name, issue: "No email" });
      if (!EMAIL.test(email)) return problems.push({ line, name, issue: `Not a valid email: ${raw}` });
      if (!name) return problems.push({ line, name: email, issue: "No name" });
      if (seen.has(email)) return problems.push({ line, name, issue: `Same email as row ${seen.get(email)}` });
      seen.set(email, line);
      ok.push({ name, email, status: known.has(email) ? (known.get(email).name === name ? "same" : "rename") : "new" });
    });
    const missing = existing.filter((m) => !seen.has(m.email));
    return { ok, problems, missing };
  }, [sheet, cols, existing]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api("/portfolio/leader/roster/import", {
        method: "POST",
        body: { rows: check.ok.map(({ name, email }) => ({ name, email })), deactivateMissing: deactivate },
      });
      setResult(r);
      setSheet(null);
      onDone(`Imported: ${r.added} added, ${r.renamed} renamed, ${r.unchanged} unchanged${r.deactivated ? `, ${r.deactivated} paused` : ""}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="pf-form" style={{ maxWidth: 720 }}>
      <h2 className="pf-h">
        Import the <em>sheet.</em>
      </h2>
      <p className="pf-muted">
        .xlsx or .csv, read in your browser. Only names and emails are saved. Re-importing adds new people and never touches existing sign-ups.
      </p>
      <label className="pf-file">
        <input type="file" accept=".xlsx,.csv" onChange={(e) => e.target.files[0] && pick(e.target.files[0])} />
      </label>
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="pf-success" role="status">
          Imported: {result.added} added, {result.renamed} renamed, {result.unchanged} unchanged{result.deactivated ? `, ${result.deactivated} paused` : ""}.
        </p>
      )}
      {sheet && (
        <>
          <div className="pf-row">
            <label className="pf-field">
              <span>Name column</span>
              <select value={cols.name} onChange={(e) => setCols({ ...cols, name: e.target.value })}>
                <option value="">Choose…</option>
                {sheet.headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
            <label className="pf-field">
              <span>Email column</span>
              <select value={cols.email} onChange={(e) => setCols({ ...cols, email: e.target.value })}>
                <option value="">Choose…</option>
                {sheet.headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </label>
          </div>
          {check && (
            <>
              <p>
                <strong>{check.ok.filter((r) => r.status === "new").length}</strong> new, <strong>{check.ok.filter((r) => r.status === "rename").length}</strong>{" "}
                renamed, <strong>{check.ok.filter((r) => r.status === "same").length}</strong> unchanged
                {check.problems.length > 0 && (
                  <>
                    , <strong className="pf-overdue">{check.problems.length} skipped</strong>
                  </>
                )}
                .
              </p>
              {check.problems.length > 0 && (
                <ul className="pf-problems">
                  {check.problems.map((p) => (
                    <li key={p.line}>
                      Row {p.line} <span lang={ar(p.name)}>{p.name}</span>: {p.issue}
                    </li>
                  ))}
                </ul>
              )}
              {check.missing.length > 0 && (
                <label className="pf-check">
                  <input type="checkbox" checked={deactivate} onChange={(e) => setDeactivate(e.target.checked)} /> Pause the {check.missing.length} member
                  {check.missing.length === 1 ? "" : "s"} on the roster who aren't in this file (their history stays)
                </label>
              )}
              <details>
                <summary className="pf-small">Preview ({check.ok.length} rows)</summary>
                <ul className="pf-preview">
                  {check.ok.slice(0, 200).map((r) => (
                    <li key={r.email}>
                      <span lang={ar(r.name)}>{r.name}</span> · <span className="pf-muted">{r.email}</span>{" "}
                      {r.status !== "same" && <span className="pf-tag pf-tag--ok">{r.status}</span>}
                    </li>
                  ))}
                </ul>
              </details>
              <button type="button" className="pill pill--solid" style={{ justifySelf: "start" }} disabled={busy || !check.ok.length} onClick={submit}>
                {busy ? "Importing…" : `Import ${check.ok.length} members`}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}

function EventList({ events, empty }) {
  if (!events.length) return <p className="pf-empty">{empty}</p>;
  return (
    <section>
      <ul className="pf-activity">
        {events.map((e) => (
          <li key={e.id} className={PROBLEMS.has(e.kind) ? "is-problem" : ""}>
            <span>
              <strong>{EVENT_TEXT[e.kind]}</strong>
              {e.name && (
                <>
                  {" · "}
                  <a href={`#portfolio/m/${e.rosterId}`} lang={ar(e.name)}>
                    {e.name}
                  </a>
                </>
              )}
              {e.detail && <span className="pf-muted"> · {e.detail}</span>}
            </span>
            <time className="pf-muted pf-small" title={fmtDateTime(e.createdAt)}>
              {ago(e.createdAt)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
