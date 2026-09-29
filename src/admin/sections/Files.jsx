import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { Button, ConfirmButton } from "../ui";
import { useAction, useToast } from "../hooks";

const size = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export default function FilesSection() {
  const [files, setFiles] = useState(null);
  const [busy, run] = useAction();
  const toast = useToast();

  const load = useCallback(
    () =>
      api("/admin/uploads")
        .then((d) => setFiles(d.files))
        .catch((e) => toast(e.message, "error")),
    [toast]
  );
  useEffect(() => {
    load();
  }, [load]);

  const upload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    run(() => api("/admin/uploads", { method: "POST", form }), "Uploaded").then((ok) => ok && load());
  };

  const copy = (url) => {
    const full = new URL(url, window.location.origin).href;
    navigator.clipboard.writeText(full).then(
      () => toast("Link copied"),
      () => toast(full)
    );
  };

  const remove = (key) => run(() => api(`/admin/uploads/${key}`, { method: "DELETE" }), "File deleted").then((ok) => ok && load());

  return (
    <div className="adm-panel adm-panel--form">
      <div className="adm-panel__head">
        <p className="adm-muted">Images and PDFs, up to 10 MB. Every file gets a public link you can use anywhere, like the Up next button.</p>
        <label className={`adm-btn adm-btn--primary adm-upload${busy ? " is-busy" : ""}`}>
          {busy ? "Uploading…" : "Upload a file"}
          <input id="file-upload" type="file" accept="image/*,application/pdf" onChange={upload} disabled={busy} />
        </label>
      </div>
      {!files ? (
        <p className="adm-muted">Loading…</p>
      ) : !files.length ? (
        <p className="adm-muted">No files yet.</p>
      ) : (
        <ul className="adm-files">
          {files.map((f) => (
            <li key={f.key} className="adm-file">
              <a className="adm-file__thumb" href={f.url} target="_blank" rel="noopener">
                {f.type.startsWith("image/") ? <img src={f.url} alt="" loading="lazy" /> : <span className="mono">PDF</span>}
              </a>
              <span className="adm-file__name">{f.key.split("/").pop()}</span>
              <span className="adm-muted adm-small">
                {size(f.size)} · {new Date(f.uploaded).toLocaleDateString()}
              </span>
              <span className="adm-file__actions">
                <Button onClick={() => copy(f.url)}>Copy link</Button>
                <ConfirmButton onConfirm={() => remove(f.key)} disabled={busy}>
                  Delete
                </ConfirmButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
