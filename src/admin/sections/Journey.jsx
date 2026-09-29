import { useState } from "react";
import { api } from "../api";
import { Button, ConfirmButton, Field, ItemList } from "../ui";
import { moved, useAction, useForm } from "../hooks";

// Same rule as the site: the first milestone that isn't done is "up next".
function statusOf(milestones, index) {
  if (milestones[index].done) return "Done";
  return milestones.findIndex((m) => !m.done) === index ? "Up next" : "Locked";
}

export default function JourneySection({ data, reload }) {
  const [selected, setSelected] = useState(null);
  const [, run] = useAction();
  const list = data.milestones;
  const current = list.find((m) => m.id === selected);

  const move = (id, dir) => {
    const ids = moved(list, id, dir);
    if (ids) run(() => api("/admin/milestones/order", { method: "PUT", body: { ids } }).then(reload));
  };

  return (
    <div className="adm-split">
      <section className="adm-panel" aria-label="Milestones">
        <div className="adm-panel__head">
          <p className="adm-muted adm-small">
            In order. The first one that isn't done shows as “Up next”; the next two show as locked steps; the rest stay hidden.
          </p>
          <Button variant="primary" onClick={() => setSelected("new")}>
            + Add
          </Button>
        </div>
        <ItemList
          label="Milestones"
          items={list}
          selected={selected}
          onSelect={setSelected}
          onMove={move}
          empty="No milestones yet."
          render={(m) => {
            const status = statusOf(list, list.indexOf(m));
            return (
              <span className="adm-list__text">
                <span>
                  {m.title} <span className={`adm-tag adm-tag--${status.replace(" ", "-").toLowerCase()}`}>{status}</span>
                </span>
                <span className="adm-muted adm-small">{m.when}</span>
              </span>
            );
          }}
        />
      </section>

      <section className="adm-panel adm-panel--form">
        {selected ? (
          <MilestoneForm
            key={selected}
            milestone={selected === "new" ? null : current}
            onSaved={(id) => reload().then(() => setSelected(id))}
            onDeleted={() => reload().then(() => setSelected(null))}
          />
        ) : (
          <p className="adm-muted">Pick a milestone to edit, or add a new one. Tick “Done” when the track gets there.</p>
        )}
      </section>
    </div>
  );
}

function MilestoneForm({ milestone, onSaved, onDeleted }) {
  const isNew = !milestone;
  const [v, set] = useForm({
    id: milestone?.id ?? "",
    title: milestone?.title ?? "",
    when: milestone?.when ?? "",
    note: milestone?.note ?? "",
    done: milestone?.done ?? false,
  });
  const [busy, run] = useAction();

  const save = (e) => {
    e.preventDefault();
    const { id, ...fields } = v;
    run(
      () =>
        isNew
          ? api("/admin/milestones", { method: "POST", body: v })
          : api(`/admin/milestones/${milestone.id}`, { method: "PUT", body: fields }),
      isNew ? "Milestone added" : "Saved"
    ).then((ok) => ok && onSaved(isNew ? id : milestone.id));
  };
  const remove = () =>
    run(() => api(`/admin/milestones/${milestone.id}`, { method: "DELETE" }), "Milestone removed").then((ok) => ok && onDeleted());

  return (
    <form className="adm-form" onSubmit={save}>
      <h2>{isNew ? "New milestone" : milestone.title}</h2>
      <div className="adm-grid">
        <Field label="Title" wide>
          <input id="ms-title" value={v.title} onChange={(e) => set("title", e.target.value)} required maxLength={80} />
        </Field>
        {isNew && (
          <Field label="Id" hint="Lowercase, numbers, dashes. Badges link to milestones by this.">
            <input
              id="ms-id"
              value={v.id}
              onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="hack-night"
            />
          </Field>
        )}
        <Field label="When" hint="A week, a date, or TBA.">
          <input id="ms-when" value={v.when} onChange={(e) => set("when", e.target.value)} required maxLength={40} />
        </Field>
        <Field label="Note" hint="One line of detail." wide>
          <input id="ms-note" value={v.note} onChange={(e) => set("note", e.target.value)} maxLength={200} />
        </Field>
      </div>
      <label className="adm-check">
        <input id="ms-done" type="checkbox" checked={v.done} onChange={(e) => set("done", e.target.checked)} />
        Done: the track has reached this milestone
      </label>
      <div className="adm-actions">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Saving…" : isNew ? "Add milestone" : "Save changes"}
        </Button>
        {!isNew && (
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Remove milestone
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}
