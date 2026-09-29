import { api } from "../api";
import { Button, ConfirmButton, Field } from "../ui";
import { useAction, useForm } from "../hooks";

const BLANK = { eyebrow: "", big: "", title: "", body: "", ctaLabel: "", ctaUrl: "" };

export default function AnnouncementSection({ data, reload }) {
  const a = data.announcement;
  const [v, set] = useForm({ ...BLANK, ...a });
  const [busy, run] = useAction();

  const save = (e) => {
    e.preventDefault();
    run(() => api("/admin/settings/announcement", { method: "PUT", body: v }), a ? "Saved" : "Tile is live").then((ok) => ok && reload());
  };
  const hide = () => run(() => api("/admin/settings/announcement", { method: "DELETE" }), "Tile hidden").then((ok) => ok && reload());

  return (
    <div className="adm-split adm-split--wide-form">
      <form className="adm-panel adm-panel--form adm-form" onSubmit={save}>
        <p className="adm-muted">
          The purple tile in the members grid. Use it for whatever's next: a survey, a meeting, an event.{" "}
          {a ? "It's showing on the site now." : <strong>It's hidden right now; save to show it.</strong>}
        </p>
        <div className="adm-grid">
          <Field label="Label" hint="Small text next to the live dot.">
            <input id="a-eyebrow" value={v.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} maxLength={40} placeholder="Up next · Survey" />
          </Field>
          <Field label="Big background text" hint="1–3 characters, printed huge behind the tile.">
            <input id="a-big" value={v.big} onChange={(e) => set("big", e.target.value)} maxLength={3} placeholder="01" />
          </Field>
          <Field label="Title" wide>
            <input id="a-title" value={v.title} onChange={(e) => set("title", e.target.value)} required maxLength={80} />
          </Field>
          <Field label="Text" wide>
            <textarea id="a-body" rows={3} value={v.body} onChange={(e) => set("body", e.target.value)} maxLength={300} />
          </Field>
          <Field label="Button label">
            <input id="a-cta-label" value={v.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} maxLength={30} placeholder="Take the survey" />
          </Field>
          <Field label="Button link" hint="A full link (https://…) opens in a new tab; #journey jumps to a section. Leave empty for no button.">
            <input id="a-cta-url" value={v.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} maxLength={500} placeholder="https://…" />
          </Field>
        </div>
        <div className="adm-actions">
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? "Saving…" : a ? "Save changes" : "Save and show"}
          </Button>
          {a && (
            <ConfirmButton onConfirm={hide} disabled={busy}>
              Hide the tile
            </ConfirmButton>
          )}
        </div>
      </form>

      <aside className="adm-panel" aria-label="Preview">
        <p className="adm-muted adm-small">Preview</p>
        <div className="adm-promo">
          {v.big && (
            <span className="adm-promo__big mono" aria-hidden="true">
              {v.big}
            </span>
          )}
          {v.eyebrow && <p className="adm-promo__eyebrow mono">● {v.eyebrow}</p>}
          <p className="adm-promo__title mono">{v.title || "Title"}</p>
          {v.body && <p className="adm-promo__body">{v.body}</p>}
          {v.ctaUrl && <span className="adm-promo__cta">{v.ctaLabel || "Open"}</span>}
        </div>
      </aside>
    </div>
  );
}
