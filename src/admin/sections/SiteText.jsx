import { api } from "../api";
import { Button, Field } from "../ui";
import { useAction, useForm } from "../hooks";

export default function SiteTextSection({ data, reload }) {
  const [v, set] = useForm({ club: "", name: "", short: "", tagline: "", semester: "", intro: "", ...data.track });
  const [busy, run] = useAction();

  const save = (e) => {
    e.preventDefault();
    run(() => api("/admin/settings/track", { method: "PUT", body: v }), "Saved").then((ok) => ok && reload());
  };

  return (
    <form className="adm-panel adm-panel--form adm-form adm-narrow" onSubmit={save}>
      <div className="adm-grid">
        <Field label="Track name" hint="The hero title; its last word is highlighted.">
          <input id="t-name" value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} />
        </Field>
        <Field label="Short name">
          <input id="t-short" value={v.short} onChange={(e) => set("short", e.target.value)} required maxLength={8} />
        </Field>
        <Field label="Club">
          <input id="t-club" value={v.club} onChange={(e) => set("club", e.target.value)} required maxLength={60} />
        </Field>
        <Field label="Semester">
          <input id="t-semester" value={v.semester} onChange={(e) => set("semester", e.target.value)} required maxLength={30} />
        </Field>
        <Field label="Tagline" hint="Shown at the end of the boot screen." wide>
          <input id="t-tagline" value={v.tagline} onChange={(e) => set("tagline", e.target.value)} required maxLength={80} />
        </Field>
        <Field label="Intro" hint="Typed out in the hero terminal." wide>
          <textarea id="t-intro" rows={4} value={v.intro} onChange={(e) => set("intro", e.target.value)} required maxLength={400} />
        </Field>
      </div>
      <div className="adm-actions">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
