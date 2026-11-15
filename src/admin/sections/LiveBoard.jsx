import { useEffect, useState } from "react";
import { api } from "../api";
import { Button } from "../ui";

// D1's datetime('now') is UTC without a zone: "2026-11-15 18:04:09".
const when = (ts) => new Date(`${ts.replace(" ", "T")}Z`).toLocaleString();

/* Every question published on the live board (/live/), newest first, with its answers.
   Questions are asked and run from /live/ itself; this is the record. */
export default function LiveBoardSection() {
  const [log, setLog] = useState(null);
  const [error, setError] = useState(null);
  const load = () =>
    api("/admin/live")
      .then((d) => {
        setLog(d.sessions);
        setError(null);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  if (error) return <p className="adm-error">Couldn't load the log: {error}</p>;
  if (!log) return <p className="adm-muted">Loading…</p>;

  return (
    <section className="adm-panel">
      <div className="adm-panel__head">
        <p className="adm-muted adm-small">
          Ask questions from{" "}
          <a className="adm-link" href="/live/" target="_blank" rel="noopener">
            the live board ↗
          </a>
          . A new question keeps the last one's answers here; "Reset board" deletes them.
        </p>
        <Button onClick={load}>Refresh</Button>
      </div>
      {log.length === 0 ? (
        <p className="adm-muted">No questions yet.</p>
      ) : (
        log.map((s, i) => (
          <details key={s.id} className="adm-fieldset adm-bio-log" open={i === 0}>
            <summary className="adm-field__label">
              <span dir="auto">{s.question}</span>
              {s.current && <span className="adm-tag adm-tag--in-progress">On the board</span>}
              <span className="adm-muted adm-small">
                {" "}
                · {when(s.createdAt)} · {s.answers.length} {s.answers.length === 1 ? "answer" : "answers"}
              </span>
            </summary>
            {s.answers.length === 0 ? (
              <p className="adm-muted adm-small">No answers.</p>
            ) : (
              <ol>
                {s.answers.map((a) => (
                  <li key={a.id}>
                    <span className="adm-muted adm-small">
                      <strong dir="auto">{a.name}</strong> · {when(a.createdAt)}
                      {a.hidden && <span className="adm-tag">Hidden</span>}
                    </span>
                    <p dir="auto">{a.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </details>
        ))
      )}
    </section>
  );
}
