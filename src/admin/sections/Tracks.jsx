import { useState } from "react";
import { api } from "../api";
import { Button, ConfirmButton, Field, ItemList } from "../ui";
import { moved, useAction, useForm } from "../hooks";
import { inkOn } from "../../lib/palette";

const HEX = /^#[0-9a-f]{6}$/i;

export default function TracksSection({ data, reload }) {
  const [selected, setSelected] = useState(null);
  const [, run] = useAction();
  const list = data.tracks ?? [];
  const current = list.find((t) => t.id === selected);

  const move = (id, dir) => {
    const ids = moved(list, id, dir);
    if (ids) run(() => api("/admin/tracks/order", { method: "PUT", body: { ids } }).then(reload));
  };

  return (
    <div className="adm-split">
      <section className="adm-panel" aria-label="Tracks">
        <div className="adm-panel__head">
          <p className="adm-muted adm-small">
            The club's other tracks. A project linked to one is a collaboration and shows in the track's colour. They're also the
            choices on the request form.
          </p>
          <Button variant="primary" onClick={() => setSelected("new")}>
            + Add
          </Button>
        </div>
        <ItemList
          label="Tracks"
          items={list}
          selected={selected}
          onSelect={setSelected}
          onMove={move}
          empty="No tracks yet. Until there are, the request form asks people to type theirs."
          render={(t) => (
            <span className="adm-list__text adm-track-row">
              <span className="adm-track-dot" style={{ background: t.color }} aria-hidden="true" />
              <span>{t.name}</span>
            </span>
          )}
        />
      </section>

      <section className="adm-panel adm-panel--form">
        {selected ? (
          <TrackForm
            key={selected}
            track={selected === "new" ? null : current}
            onSaved={(id) => reload().then(() => setSelected(id))}
            onDeleted={() => reload().then(() => setSelected(null))}
          />
        ) : (
          <p className="adm-muted">Pick a track to edit it, or add a new one.</p>
        )}
      </section>
    </div>
  );
}

function TrackForm({ track, onSaved, onDeleted }) {
  const isNew = !track;
  const [v, set] = useForm({ id: track?.id ?? "", name: track?.name ?? "", color: track?.color ?? "#57e3d8" });
  const [busy, run] = useAction();
  const valid = HEX.test(v.color);

  const save = (e) => {
    e.preventDefault();
    const { id, ...fields } = v;
    run(
      () => (isNew ? api("/admin/tracks", { method: "POST", body: v }) : api(`/admin/tracks/${track.id}`, { method: "PUT", body: fields })),
      isNew ? "Track added" : "Saved"
    ).then((ok) => ok && onSaved(isNew ? id : track.id));
  };
  const remove = () => run(() => api(`/admin/tracks/${track.id}`, { method: "DELETE" }), "Track removed").then((ok) => ok && onDeleted());

  return (
    <form className="adm-form" onSubmit={save}>
      <h2>{isNew ? "New track" : track.name}</h2>
      <div className="adm-grid">
        <Field label="Name">
          <input id="tr-name" value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={40} placeholder="Media" />
        </Field>
        {isNew && (
          <Field label="Id" hint="Lowercase, numbers, dashes. Can't change later.">
            <input
              id="tr-id"
              value={v.id}
              onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="media"
            />
          </Field>
        )}
        <Field label="Theme colour" hint="Their brand colour. It lights up their collaborations on the site.">
          <span className="adm-color">
            <input id="tr-color-pick" type="color" value={valid ? v.color : "#000000"} onChange={(e) => set("color", e.target.value)} aria-label="Pick a colour" />
            <input id="tr-color" value={v.color} onChange={(e) => set("color", e.target.value.trim())} required pattern="#[0-9a-fA-F]{6}" maxLength={7} />
          </span>
        </Field>
      </div>

      {valid && (
        <div className="adm-track-preview" style={{ "--hue": v.color }}>
          <span className="adm-track-preview__sticker" style={{ color: inkOn(v.color) }}>
            collab × {v.name || "Track"}
          </span>
          <span className="adm-track-preview__screen">
            <span>● building</span>
          </span>
        </div>
      )}

      <div className="adm-actions">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Saving…" : isNew ? "Add track" : "Save changes"}
        </Button>
        {!isNew && (
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Remove track
          </ConfirmButton>
        )}
      </div>
      {!isNew && <p className="adm-muted adm-small">Removing a track turns its collaborations into plain projects. Nothing else is lost.</p>}
    </form>
  );
}
