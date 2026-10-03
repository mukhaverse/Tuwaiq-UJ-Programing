import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { Button, ConfirmButton, Field, ItemList } from "../ui";
import { useAction, useForm } from "../hooks";
import Character from "../../components/character/Character";
import { color } from "../../lib/palette";
import { nameLang, shortName } from "../../data/members";
import { KINDS, STATUS, kindOf, ticket } from "../../data/projects";

const FILTERS = [...Object.keys(STATUS), "all"];
const filterLabel = (f) => (f === "all" ? "All" : STATUS[f]);
const tagClass = (status) => `adm-tag adm-tag--${status.replace("_", "-")}`;

// Database timestamps are UTC: "2026-10-03 14:05:00".
const when = (ts) => new Date(`${ts.replace(" ", "T")}Z`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** Projects aren't in /api/content (requests carry private contact details), so they load here. */
function useProjects() {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(
    () =>
      api("/admin/projects")
        .then((d) => {
          setList(d.projects);
          setError(null);
        })
        .catch((e) => setError(e.message)),
    []
  );
  useEffect(() => {
    reload();
  }, [reload]);
  return { list, error, reload };
}

export default function ProjectsSection({ data, reload: reloadSite }) {
  const projects = useProjects();
  const [filter, setFilter] = useState("new");
  const [selected, setSelected] = useState(null);

  if (projects.error) return <p className="adm-error">Couldn't load projects: {projects.error}</p>;
  if (!projects.list) return <p className="adm-muted">Loading…</p>;

  const all = projects.list;
  const shown = filter === "all" ? all : all.filter((p) => p.status === filter);
  const current = all.find((p) => p.id === selected);
  const count = (f) => (f === "all" ? all.length : all.filter((p) => p.status === f).length);
  // The public site shows in-progress projects, so it needs a refresh too.
  const refresh = () => Promise.all([projects.reload(), reloadSite()]);

  return (
    <div className="adm-split">
      <section className="adm-panel" aria-label="Projects">
        <div className="adm-panel__head">
          <p className="adm-muted adm-small">
            Requests from other tracks land in <strong>New request</strong>. Anything <strong>In progress</strong> shows in the Workshop on the site.
          </p>
          <Button variant="primary" onClick={() => setSelected("new")}>
            + Add
          </Button>
        </div>
        <div className="adm-filters" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f} type="button" className="adm-filter" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {filterLabel(f)} <span className="adm-filter__count">{count(f)}</span>
            </button>
          ))}
        </div>
        <ItemList
          label="Projects"
          items={shown}
          selected={selected}
          onSelect={setSelected}
          empty={filter === "new" ? "Inbox zero. No new requests." : "Nothing here."}
          render={(p) => (
            <span className="adm-list__text">
              <span>
                {p.title} {filter === "all" && <span className={tagClass(p.status)}>{STATUS[p.status]}</span>}
              </span>
              <span className="adm-muted adm-small">
                #{ticket(p.id)} · {p.track || "In-house"} · {kindOf(p.kind).label} · {when(p.createdAt)}
              </span>
            </span>
          )}
        />
      </section>

      <section className="adm-panel adm-panel--form">
        {selected ? (
          <ProjectForm
            key={selected}
            project={selected === "new" ? null : current}
            members={data.members}
            onSaved={(id, status) =>
              refresh().then(() => {
                // Keep it in view after its status changes.
                if (filter !== "all" && status !== filter) setFilter(status);
                setSelected(id);
              })
            }
            onDeleted={() => refresh().then(() => setSelected(null))}
          />
        ) : (
          <p className="adm-muted">
            Pick a request to read it, assign people and set its status. Use <strong>+ Add</strong> for the track's own projects. Share{" "}
            <a className="adm-link" href="/#request" target="_blank" rel="noopener">
              /#request
            </a>{" "}
            with other tracks: it opens the request form.
          </p>
        )}
      </section>
    </div>
  );
}

function ProjectForm({ project, members, onSaved, onDeleted }) {
  const isNew = !project;
  const [v, set] = useForm({
    title: project?.title ?? "",
    track: project?.track ?? "",
    kind: project?.kind ?? "other",
    status: project?.status ?? "in_progress",
    note: project?.note ?? "",
    details: project?.details ?? "",
    requester: project?.requester ?? "",
    contact: project?.contact ?? "",
    deadline: project?.deadline ?? "",
    members: project?.members ?? [],
  });
  const [busy, run] = useAction();
  const toggleMember = (id) => set("members", v.members.includes(id) ? v.members.filter((m) => m !== id) : [...v.members, id]);

  const save = (e) => {
    e.preventDefault();
    run(
      () => (isNew ? api("/admin/projects", { method: "POST", body: v }) : api(`/admin/projects/${project.id}`, { method: "PUT", body: v })),
      isNew ? "Project added" : "Saved"
    ).then((res) => res && onSaved(isNew ? res.id : project.id, v.status));
  };
  const remove = () => run(() => api(`/admin/projects/${project.id}`, { method: "DELETE" }), "Project removed").then((ok) => ok && onDeleted());

  return (
    <form className="adm-form" onSubmit={save}>
      <div>
        <h2>{isNew ? "New project" : project.title}</h2>
        {!isNew && (
          <p className="adm-muted adm-small">
            #{ticket(project.id)} · {project.requester ? `requested by ${project.requester}` : "added"} on {when(project.createdAt)}
          </p>
        )}
      </div>

      {project?.requester && (
        <div className="adm-request">
          <p className="adm-eyebrow">The request</p>
          <p className="adm-request__details">{project.details}</p>
          <dl className="adm-request__facts">
            <dt>From</dt>
            <dd>
              {project.requester} · {project.track}
            </dd>
            <dt>Reach them</dt>
            <dd>
              <ContactLink contact={project.contact} />
            </dd>
            {project.deadline && (
              <>
                <dt>Needed by</dt>
                <dd>{project.deadline}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      <fieldset className="adm-fieldset">
        <legend>Status</legend>
        <div className="adm-status" role="radiogroup" aria-label="Status">
          {Object.entries(STATUS).map(([id, label]) => (
            <label key={id} className={`adm-status__opt adm-status__opt--${id.replace("_", "-")}${v.status === id ? " is-on" : ""}`}>
              <input type="radio" name="status" checked={v.status === id} onChange={() => set("status", id)} />
              {label}
            </label>
          ))}
        </div>
        <p className="adm-field__hint">In progress shows it on the site. Done and Declined take it off again.</p>
      </fieldset>

      <div className="adm-grid">
        <Field label="Title" hint="Shown on the site." wide>
          <input id="pj-title" value={v.title} onChange={(e) => set("title", e.target.value)} required maxLength={80} />
        </Field>
        <Field label="For track" hint="Leave empty for the track's own projects.">
          <input id="pj-track" value={v.track} onChange={(e) => set("track", e.target.value)} maxLength={60} placeholder="In-house" />
        </Field>
        <Field label="Kind">
          <select id="pj-kind" value={v.kind} onChange={(e) => set("kind", e.target.value)}>
            {KINDS.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Latest update" hint="One public line under the title, like “Draft ready for review”." wide>
          <input id="pj-note" value={v.note} onChange={(e) => set("note", e.target.value)} maxLength={160} />
        </Field>
      </div>

      <fieldset className="adm-fieldset">
        <legend>Crew · {v.members.length}</legend>
        <div className="adm-chips">
          {members.map((m) => (
            <label key={m.id} className={`adm-chip adm-chip--member${v.members.includes(m.id) ? " is-on" : ""}`}>
              <input type="checkbox" checked={v.members.includes(m.id)} onChange={() => toggleMember(m.id)} />
              <Character type={m.avatar.char} body={color(m.avatar.body)} />
              <span lang={nameLang(m.name)}>{shortName(m)}</span>
            </label>
          ))}
        </div>
        <p className="adm-field__hint">Their characters peek over the project's card on the site.</p>
      </fieldset>

      <details className="adm-fieldset adm-private">
        <summary>Private details{project?.requester ? " (edit the request)" : ""}</summary>
        <div className="adm-grid">
          <Field label="Requested by">
            <input id="pj-requester" value={v.requester} onChange={(e) => set("requester", e.target.value)} maxLength={80} />
          </Field>
          <Field label="Contact">
            <input id="pj-contact" value={v.contact} onChange={(e) => set("contact", e.target.value)} maxLength={120} />
          </Field>
          <Field label="Needed by">
            <input id="pj-deadline" value={v.deadline} onChange={(e) => set("deadline", e.target.value)} maxLength={60} />
          </Field>
          <Field label="Details" hint="Never shown on the site." wide>
            <textarea id="pj-details" value={v.details} onChange={(e) => set("details", e.target.value)} maxLength={3000} rows={5} />
          </Field>
        </div>
      </details>

      <div className="adm-actions">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Saving…" : isNew ? "Add project" : "Save changes"}
        </Button>
        {!isNew && (
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Delete
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}

/** Email and phone numbers become links; anything else (an @handle…) stays text. */
function ContactLink({ contact }) {
  if (/^\S+@\S+\.\S+$/.test(contact)) return <a className="adm-link" href={`mailto:${contact}`}>{contact}</a>;
  if (/^\+?[\d\s()-]{7,}$/.test(contact)) return <a className="adm-link" href={`tel:${contact.replace(/[^\d+]/g, "")}`}>{contact}</a>;
  return <span>{contact}</span>;
}
