import { useEffect, useMemo, useState } from "react";
import Character, { CHARACTERS } from "../../components/character/Character";
import { BadgeMark } from "../../components/badges/Badge";
import { ORIGINAL_COLOURS, color, palette, surveyColour } from "../../lib/palette";
import { roleLabel, yearLabel } from "../../data/members";
import { api } from "../api";
import { Button, ConfirmButton, Field, ItemList } from "../ui";
import { moved, useAction, useForm } from "../hooks";

// Two swatch rows: the original character colours, then the survey's exact shades.
const SURVEY_SHADES = Object.keys(palette).filter((k) => k !== "ink" && !ORIGINAL_COLOURS.includes(k));
const COLOUR_ROWS = [
  ["Original", ORIGINAL_COLOURS],
  ["Survey shades", SURVEY_SHADES],
];

export default function MembersSection({ data, reload }) {
  const [selected, setSelected] = useState(null); // member id, "new", or null
  const [query, setQuery] = useState("");
  const [, run] = useAction();
  const picks = useSurveyColours();

  const q = query.trim().toLowerCase();
  const list = q ? data.members.filter((m) => `${m.name} ${m.id} ${m.major}`.toLowerCase().includes(q)) : data.members;
  const current = data.members.find((m) => m.id === selected);

  const move = (id, dir) => {
    const ids = moved(data.members, id, dir);
    if (ids) run(() => api("/admin/members/order", { method: "PUT", body: { ids } }).then(reload));
  };

  return (
    <div className="adm-split">
      <section className="adm-panel" aria-label="All members">
        <div className="adm-panel__head">
          <input
            id="member-search"
            type="search"
            placeholder={`Search ${data.members.length} members`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button variant="primary" onClick={() => setSelected("new")}>
            + Add
          </Button>
        </div>
        <p className="adm-muted adm-small">Order sets the roster; the first three stand on the mountain.</p>
        <ItemList
          label="Members"
          items={list}
          selected={selected}
          onSelect={setSelected}
          onMove={q ? undefined : move}
          empty="No members match."
          render={(m) => (
            <>
              <span className="adm-list__avatar">
                <Character type={m.avatar.char} body={color(m.avatar.body)} />
              </span>
              <span className="adm-list__text">
                <span lang={/[؀-ۿ]/.test(m.name) ? "ar" : undefined}>{m.name}</span>
                <span className="adm-muted adm-small">
                  {roleLabel[m.role]} · {m.major} · {yearLabel(m.year)}
                </span>
              </span>
            </>
          )}
        />
      </section>

      <section className="adm-panel adm-panel--form">
        {selected ? (
          <MemberForm
            key={selected}
            member={selected === "new" ? null : current}
            badges={data.badges}
            surveyPick={picks.get(selected) ?? null}
            onSaved={(id) => reload().then(() => setSelected(id))}
            onDeleted={() => reload().then(() => setSelected(null))}
          />
        ) : (
          <p className="adm-muted">Pick a member to edit, or add a new one.</p>
        )}
      </section>
    </div>
  );
}

/** Member id → the favourite colour from their latest survey answer: { name, hex, exact, nearest }. */
function useSurveyColours() {
  const [responses, setResponses] = useState([]);
  useEffect(() => {
    // Only a hint on the colour picker: without it the form works the same.
    api("/admin/survey")
      .then((d) => setResponses(d.responses))
      .catch(() => {});
  }, []);
  return useMemo(() => {
    const picks = new Map();
    // Oldest first, so each member ends up with their latest answer.
    for (const r of responses) {
      const name = r.answers["Favorite Color"];
      if (!r.memberId || !name) continue;
      const hex = /^#[0-9a-f]{3,8}$/i.test(r.answers["Favorite Color Hex"] ?? "") ? r.answers["Favorite Color Hex"] : null;
      picks.set(r.memberId, { name, hex, ...surveyColour(name) });
    }
    return picks;
  }, [responses]);
}

/* Every bio submitted for this member from their profile card, newest first.
   "Use this" puts one back in the Bio field (then Save changes). */
function BioHistory({ memberId, current, onUse }) {
  const [edits, setEdits] = useState(null);
  useEffect(() => {
    api(`/admin/members/${encodeURIComponent(memberId)}/bio-edits`)
      .then((d) => setEdits(d.edits))
      .catch(() => setEdits([]));
  }, [memberId]);
  if (!edits?.length) return null;
  return (
    <details className="adm-field adm-field--wide adm-bio-log">
      <summary className="adm-field__label">Bio history · {edits.length} from the site</summary>
      <ol>
        {edits.map((e) => (
          <li key={e.id}>
            <span className="adm-muted adm-small">{new Date(`${e.createdAt.replace(" ", "T")}Z`).toLocaleString()}</span>
            <p dir="auto">{e.bio}</p>
            {e.bio === current.trim() ? (
              <span className="adm-muted adm-small">In the Bio field</span>
            ) : (
              <Button onClick={() => onUse(e.bio)}>Use this</Button>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}

function MemberForm({ member, badges, surveyPick, onSaved, onDeleted }) {
  const isNew = !member;
  const [v, set] = useForm({
    id: member?.id ?? "",
    name: member?.name ?? "",
    short: member?.short ?? "",
    role: member?.role ?? "member",
    major: member?.major ?? "Software Engineering",
    year: member?.year ?? 1,
    bio: member?.bio ?? "",
    quote: member?.quote ?? "",
    char: member?.avatar.char ?? "blob",
    body: member?.avatar.body ?? "butter",
    badges: member?.badges ?? [],
  });
  const [busy, run] = useAction();

  const save = (e) => {
    e.preventDefault();
    const { id, char, body, ...rest } = v;
    const payload = { ...rest, year: Number(v.year), avatar: { char, body } };
    run(
      () =>
        isNew
          ? api("/admin/members", { method: "POST", body: { id, ...payload } })
          : api(`/admin/members/${member.id}`, { method: "PUT", body: payload }),
      isNew ? "Member added" : "Saved"
    ).then((ok) => ok && onSaved(isNew ? id : member.id));
  };

  const remove = () => run(() => api(`/admin/members/${member.id}`, { method: "DELETE" }), "Member removed").then((ok) => ok && onDeleted());

  const toggleBadge = (id) => set("badges", v.badges.includes(id) ? v.badges.filter((b) => b !== id) : [...v.badges, id]);

  return (
    <form className="adm-form" onSubmit={save}>
      <div className="adm-form__head">
        <div className="adm-preview">
          <Character type={v.char} body={color(v.body)} />
        </div>
        <div>
          <h2>{isNew ? "New member" : member.name}</h2>
          {!isNew && (
            <p className="adm-form__links adm-small">
              <a className="adm-link" href={`/#member/${member.id}`} target="_blank" rel="noopener">
                Open their profile ↗
              </a>
              {/* Admin only: their answers and stats from the members survey. */}
              <a className="adm-link" href={`#admin/survey/people/${encodeURIComponent(member.id)}`}>
                Survey answers & stats →
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="adm-grid">
        <Field label="Full name" hint="Exactly as they write it, in Arabic or English." wide>
          <input id="m-name" value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
        </Field>
        {isNew && (
          <Field label="Link id" hint="Used in their profile link (#member/…). Lowercase, numbers, dashes. Can't be changed later.">
            <input
              id="m-id"
              value={v.id}
              onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="sara-ahmed"
            />
          </Field>
        )}
        <Field label="Card name" hint="Optional. Only if first + last name comes out wrong.">
          <input id="m-short" value={v.short} onChange={(e) => set("short", e.target.value)} maxLength={60} />
        </Field>
        <Field label="Role">
          <select id="m-role" value={v.role} onChange={(e) => set("role", e.target.value)}>
            {Object.entries(roleLabel).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Major">
          <input id="m-major" value={v.major} onChange={(e) => set("major", e.target.value)} required maxLength={80} />
        </Field>
        <Field label="Year">
          <select id="m-year" value={v.year} onChange={(e) => set("year", Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((y) => (
              <option key={y} value={y}>
                {yearLabel(y)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bio" hint="One or two sentences. Profiles say “coming soon” until it's filled." wide>
          <textarea id="m-bio" rows={3} value={v.bio} onChange={(e) => set("bio", e.target.value)} maxLength={600} />
        </Field>
        {!isNew && <BioHistory memberId={member.id} current={v.bio} onUse={(bio) => set("bio", bio)} />}
        <Field label="Playground quote" hint="What their character says on the playground board." wide>
          <input id="m-quote" value={v.quote} onChange={(e) => set("quote", e.target.value)} maxLength={160} />
        </Field>
      </div>

      <fieldset className="adm-fieldset">
        <legend>Character</legend>
        <div className="adm-chars">
          {CHARACTERS.map((ch) => (
            <button
              type="button"
              key={ch}
              className={`adm-char${v.char === ch ? " is-on" : ""}`}
              onClick={() => set("char", ch)}
              aria-pressed={v.char === ch}
              title={ch}
            >
              <Character type={ch} body={color(v.body)} />
              <span className="adm-small">{ch}</span>
            </button>
          ))}
        </div>
        {COLOUR_ROWS.map(([title, keys]) => (
          <div key={title} className="adm-swatch-row">
            <span className="adm-muted adm-small">{title}</span>
            <div className="adm-swatches" role="radiogroup" aria-label={`${title} colours`}>
              {keys.map((k) => {
                const mark = k === surveyPick?.exact ? "picked" : k === surveyPick?.nearest ? "nearest" : null;
                const label = mark === "picked" ? `${k} (their survey pick)` : mark === "nearest" ? `${k} (closest original to their pick)` : k;
                return (
                  <button
                    type="button"
                    key={k}
                    role="radio"
                    aria-checked={v.body === k}
                    className={`adm-swatch${v.body === k ? " is-on" : ""}${mark ? ` is-${mark}` : ""}`}
                    style={{ background: palette[k] }}
                    onClick={() => set("body", k)}
                    title={label}
                    aria-label={label}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {surveyPick && (
          <div className="adm-pick adm-small">
            <span className="adm-pick__dot" style={{ background: surveyPick.hex ?? palette[surveyPick.exact] }} aria-hidden="true" />
            <span>
              Survey pick: <strong>{surveyPick.name}</strong>
              {surveyPick.exact ? (
                <>
                  {" "}
                  <span className="adm-pick__mark is-picked">★</span> {surveyPick.exact}
                  {" · closest original "}
                  <span className="adm-pick__mark is-nearest">≈</span> {surveyPick.nearest}
                </>
              ) : (
                " (no character colour matches)"
              )}
            </span>
            {surveyPick.exact && surveyPick.exact !== v.body && <Button onClick={() => set("body", surveyPick.exact)}>Use survey pick</Button>}
            {surveyPick.nearest && surveyPick.nearest !== v.body && <Button onClick={() => set("body", surveyPick.nearest)}>Use closest original</Button>}
          </div>
        )}
      </fieldset>

      <fieldset className="adm-fieldset">
        <legend>Badges earned</legend>
        {badges.length ? (
          <div className="adm-chips">
            {badges.map((b) => (
              <label key={b.id} className={`adm-chip${v.badges.includes(b.id) ? " is-on" : ""}`}>
                <input type="checkbox" checked={v.badges.includes(b.id)} onChange={() => toggleBadge(b.id)} />
                <BadgeMark badge={b} size="1.4rem" />
                {b.name}
              </label>
            ))}
          </div>
        ) : (
          <p className="adm-muted">No badges yet. Create them in the Badges section.</p>
        )}
      </fieldset>

      <div className="adm-actions">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Saving…" : isNew ? "Add member" : "Save changes"}
        </Button>
        {!isNew && (
          <ConfirmButton onConfirm={remove} disabled={busy}>
            Remove member
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}
