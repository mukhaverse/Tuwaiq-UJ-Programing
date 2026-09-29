import { useState } from "react";
import { BadgeMark } from "../../components/badges/Badge";
import { api } from "../api";
import { Button, ConfirmButton, Field, ItemList } from "../ui";
import { moved, useAction, useForm } from "../hooks";

export default function BadgesSection({ data, reload }) {
  const [selected, setSelected] = useState(null);
  const [, run] = useAction();
  const list = data.badges;
  const current = list.find((b) => b.id === selected);
  const earned = (id) => data.members.filter((m) => m.badges.includes(id)).length;

  const move = (id, dir) => {
    const ids = moved(list, id, dir);
    if (ids) run(() => api("/admin/badges/order", { method: "PUT", body: { ids } }).then(reload));
  };

  return (
    <div className="adm-split">
      <section className="adm-panel" aria-label="Badges">
        <div className="adm-panel__head">
          <p className="adm-muted adm-small">Award badges to people from their page in Members.</p>
          <Button variant="primary" onClick={() => setSelected("new")}>
            + Add
          </Button>
        </div>
        <ItemList
          label="Badges"
          items={list}
          selected={selected}
          onSelect={setSelected}
          onMove={move}
          empty="No badges yet."
          render={(b) => (
            <>
              <BadgeMark badge={b} size="2rem" />
              <span className="adm-list__text">
                <span>{b.name}</span>
                <span className="adm-muted adm-small">
                  {earned(b.id)} earned{b.milestone ? ` · on “${data.milestones.find((m) => m.id === b.milestone)?.title ?? b.milestone}”` : ""}
                </span>
              </span>
            </>
          )}
        />
      </section>

      <section className="adm-panel adm-panel--form">
        {selected ? (
          <BadgeForm
            key={selected}
            badge={selected === "new" ? null : current}
            milestones={data.milestones}
            onSaved={(id) => reload().then(() => setSelected(id))}
            onDeleted={() => reload().then(() => setSelected(null))}
          />
        ) : (
          <p className="adm-muted">Pick a badge to edit, or add a new one.</p>
        )}
      </section>
    </div>
  );
}

function BadgeForm({ badge, milestones, onSaved, onDeleted }) {
  const isNew = !badge;
  const [v, set] = useForm({
    id: badge?.id ?? "",
    name: badge?.name ?? "",
    glyph: badge?.glyph ?? "",
    description: badge?.description ?? "",
    milestone: badge?.milestone ?? "",
  });
  const [busy, run] = useAction();

  const save = (e) => {
    e.preventDefault();
    const { id, ...fields } = v;
    run(
      () => (isNew ? api("/admin/badges", { method: "POST", body: v }) : api(`/admin/badges/${badge.id}`, { method: "PUT", body: fields })),
      isNew ? "Badge added" : "Saved"
    ).then((ok) => ok && onSaved(isNew ? id : badge.id));
  };
  const remove = () =>
    run(() => api(`/admin/badges/${badge.id}`, { method: "DELETE" }), "Badge removed (and taken back from everyone who had it)").then(
      (ok) => ok && onDeleted()
    );

  return (
    <form className="adm-form" onSubmit={save}>
      <div className="adm-form__head">
        <div className="adm-preview adm-preview--badge">
          <BadgeMark badge={{ glyph: v.glyph || "?" }} size="100%" />
        </div>
        <h2>{isNew ? "New badge" : badge.name}</h2>
      </div>
      <div className="adm-grid">
        <Field label="Name">
          <input id="b-name" value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} />
        </Field>
        {isNew && (
          <Field label="Id" hint="Lowercase, numbers, dashes.">
            <input
              id="b-id"
              value={v.id}
              onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="bug-hunter"
            />
          </Field>
        )}
        <Field label="Glyph" hint="1–3 characters printed in the middle.">
          <input id="b-glyph" value={v.glyph} onChange={(e) => set("glyph", e.target.value)} required maxLength={3} />
        </Field>
        <Field label="Journey milestone" hint="Optional. The badge also shows on that step of the journey.">
          <select id="b-milestone" value={v.milestone} onChange={(e) => set("milestone", e.target.value)}>
            <option value="">None</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="How it's earned" hint="One line." wide>
          <input id="b-desc" value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={200} />
        </Field>
      </div>
      <div className="adm-actions">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Saving…" : isNew ? "Add badge" : "Save changes"}
        </Button>
        {!isNew && (
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Remove badge
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}
