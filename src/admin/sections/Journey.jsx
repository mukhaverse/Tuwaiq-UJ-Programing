import { useState } from "react";
import { api } from "../api";
import { Button, ConfirmButton, Field, ItemList } from "../ui";
import { moved, useAction, useForm, useToast } from "../hooks";

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
  const [v, set, setValues] = useForm({
    id: milestone?.id ?? "",
    title: milestone?.title ?? "",
    when: milestone?.when ?? "",
    note: milestone?.note ?? "",
    done: milestone?.done ?? false,
    photos: milestone?.photos ?? [],
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
      <Photos photos={v.photos} onChange={(change) => setValues((prev) => ({ ...prev, photos: change(prev.photos) }))} />
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

// An image file's size in pixels: { w, h }, or {} if it can't be read.
function measure(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  return new Promise((resolve) => {
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({});
    img.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

/* The event's photos: shown on the site as a pile of Polaroids when the milestone is clicked.
   onChange takes a function from the current list to the new one. */
function Photos({ photos, onChange }) {
  const [uploading, setUploading] = useState(0);
  const toast = useToast();

  const upload = async (e) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!files.length) return;
    setUploading(files.length);
    const added = [];
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      try {
        // Its size picks the Polaroid's shape on the site.
        const [{ url }, size] = await Promise.all([api("/admin/uploads", { method: "POST", form }), measure(file)]);
        added.push({ url, caption: "", ...size });
      } catch (err) {
        toast(`${file.name}: ${err.message}`, "error");
      }
      setUploading((n) => n - 1);
    }
    if (added.length) {
      onChange((list) => [...list, ...added]);
      toast(`${added.length} ${added.length === 1 ? "photo" : "photos"} added. Save to publish.`);
    }
  };

  const update = (i, patch) => onChange((list) => list.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i, dir) =>
    onChange((list) => {
      const to = i + dir;
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });

  return (
    <fieldset className="adm-fieldset">
      <legend>Photos</legend>
      <p className="adm-muted adm-small">
        Shown as a pile of Polaroids when someone clicks this milestone, first photo on top. Captions are handwritten on the
        Polaroid's strip.
      </p>
      {photos.length > 0 && (
        <ol className="adm-photos">
          {photos.map((p, i) => (
            <li key={p.url} className="adm-photo">
              <img
                src={p.url}
                alt=""
                loading="lazy"
                // Photos added before sizes were recorded get theirs here, saved with the next save.
                onLoad={(e) => !p.w && update(i, { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              />
              <input
                aria-label={`Caption for photo ${i + 1}`}
                value={p.caption}
                onChange={(e) => update(i, { caption: e.target.value })}
                maxLength={120}
                placeholder="Caption (optional)"
              />
              <span className="adm-photo__tools">
                <Button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                  ↑
                </Button>
                <Button onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Move down">
                  ↓
                </Button>
                <Button variant="danger" onClick={() => onChange((list) => list.filter((_, j) => j !== i))} aria-label="Remove photo">
                  ✕
                </Button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <label className="adm-btn adm-btn--plain adm-upload">
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" multiple onChange={upload} disabled={uploading > 0} />
        {uploading > 0 ? `Uploading ${uploading}…` : "+ Upload photos"}
      </label>
    </fieldset>
  );
}
