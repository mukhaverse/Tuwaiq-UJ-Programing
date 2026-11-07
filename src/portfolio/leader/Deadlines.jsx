// Leaders: the task's deadlines, one row each. Add as many as needed; each has a date and
// time, an optional title and note, and may count for the initial or the revised
// submission (what On time / Late and Overdue are measured against). The rest are dates
// members see with a countdown. Changing deadlines never changes anyone's status,
// progress or past On time / Late flags.
import { useEffect, useState } from "react";
import { DEADLINE_COUNTS_LABEL, MAX_DEADLINES, deadlineTitle, nextDeadline, timeLeft } from "../../data/portfolio";
import { TIMEZONE, fmtDateTime, fromLocalInput, toLocalInput } from "../format";
import { PageState } from "../parts";
import { api } from "../session";

const toForm = (d) => ({
  items: d.items.map((x) => ({ ...x, local: toLocalInput(x.due), showNote: Boolean(x.note) })),
  close: d.closeAfterDeadline,
});

export default function Deadlines() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(null);
  const [dirty, setDirty] = useState(false);

  const load = () =>
    api("/portfolio/leader/deadlines")
      .then((d) => (setForm(toForm(d)), setDirty(false)))
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  if (!form) return <PageState error={error} onRetry={load} />;

  const touched = () => (setDirty(true), setOk(null));
  const update = (id, patch) => {
    setForm((f) => ({ ...f, items: f.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
    touched();
  };
  const remove = (id) => {
    setForm((f) => ({ ...f, items: f.items.filter((x) => x.id !== id) }));
    touched();
  };
  const add = () => {
    const used = new Set(form.items.map((x) => x.counts));
    const counts = !used.has("initial") ? "initial" : !used.has("revision") ? "revision" : "other";
    setForm((f) => ({ ...f, items: [...f.items, { id: crypto.randomUUID(), due: "", local: "", title: "", note: "", counts, isNew: true, showNote: false }] }));
    touched();
  };

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    const missing = form.items.find((x) => !fromLocalInput(x.local));
    if (missing) return setError(`Pick a date for “${deadlineTitle(missing)}”, or remove it.`);
    setSaving(true);
    try {
      const saved = await api("/portfolio/leader/deadlines", {
        method: "PUT",
        body: {
          items: form.items.map(({ id, local, title, note, counts }) => ({ id, due: fromLocalInput(local), title, note, counts })),
          closeAfterDeadline: form.close,
        },
      });
      setForm(toForm(saved));
      setDirty(false);
      setOk("Saved. Nobody's status or progress changed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const savedNext = nextDeadline({ items: form.items.filter((x) => !x.isNew && x.due), closeAfterDeadline: false });

  return (
    <div className="pf-page">
      <header className="pf-head">
        <div>
          <p className="eyebrow mono">Leaders · Build your portfolio</p>
          <h1 className="pf-display">
            Dead<em>lines.</em>
          </h1>
          <p className="pf-lede">As many as you need. Times in {TIMEZONE}; members see their own timezone.</p>
        </div>
      </header>

      <form onSubmit={save}>
        {!form.items.length && <p className="pf-empty">No deadlines yet.</p>}

        <ol className="pf-deditor">
          {form.items.map((x, i) => {
            const usedElsewhere = (kind) => form.items.some((o) => o.id !== x.id && o.counts === kind);
            const iso = fromLocalInput(x.local);
            const left = timeLeft(iso);
            return (
              <li key={x.id} className={savedNext?.id === x.id ? "is-next" : ""}>
                <span className="pf-deditor__n">{String(i + 1).padStart(2, "0")}</span>
                <label className="pf-field">
                  <span>{savedNext?.id === x.id ? "Next · date" : "Date"}</span>
                  <input type="datetime-local" required value={x.local} onChange={(e) => update(x.id, { local: e.target.value })} />
                  {iso && <span className="pf-deditor__when">{left.overdue ? "Passed" : left.text}</span>}
                </label>
                <label className="pf-field">
                  <span>Title</span>
                  <input
                    maxLength={80}
                    value={x.title}
                    onChange={(e) => update(x.id, { title: e.target.value })}
                    placeholder={x.counts === "other" ? "e.g. Check-in" : DEADLINE_COUNTS_LABEL[x.counts]}
                  />
                  {!x.showNote && (
                    <button type="button" className="pf-textbtn pf-small" style={{ justifySelf: "start" }} onClick={() => update(x.id, { showNote: true })}>
                      + Note
                    </button>
                  )}
                </label>
                <label className="pf-field">
                  <span>Counts for</span>
                  <select value={x.counts} onChange={(e) => update(x.id, { counts: e.target.value })}>
                    {Object.entries(DEADLINE_COUNTS_LABEL).map(([value, label]) => (
                      <option key={value} value={value} disabled={value !== "other" && usedElsewhere(value)}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="pf-deditor__x" onClick={() => remove(x.id)} aria-label={`Remove deadline ${i + 1}`} title="Remove">
                  ×
                </button>
                {x.showNote && (
                  <label className="pf-field pf-deditor__note">
                    <span>Note for members</span>
                    <textarea rows={2} maxLength={300} value={x.note} onChange={(e) => update(x.id, { note: e.target.value })} placeholder="What should be ready by then?" />
                  </label>
                )}
                {iso && x.isNew && <span className="sr-only">{fmtDateTime(iso)}</span>}
              </li>
            );
          })}
        </ol>

        <div className="pf-row" style={{ marginTop: 24 }}>
          <button type="button" className="pf-btn" onClick={add} disabled={form.items.length >= MAX_DEADLINES}>
            + Add deadline
          </button>
        </div>

        <div className="pf-more" style={{ marginTop: 48 }}>
          <div style={{ display: "grid", gap: 8, padding: "22px 0" }}>
            <label className="pf-check">
              <input type="checkbox" checked={form.close} onChange={(e) => (setForm({ ...form, close: e.target.checked }), touched())} /> Close submissions after
              their deadline
            </label>
            <p className="pf-muted pf-small">Off: late work is accepted and marked Late. “Just a date” deadlines never mark anyone late or close anything.</p>
          </div>
        </div>

        <div className="pf-savebar">
          <button type="submit" className="pill pill--solid" disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save"}
          </button>
          {dirty && !error && <span className="pf-muted pf-small">Unsaved changes</span>}
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
        </div>
      </form>
    </div>
  );
}
