import { useEffect, useMemo, useState } from "react";
import Character, { CHARACTERS } from "../../components/character/Character";
import { BadgeMark } from "../../components/badges/Badge";
import { ORIGINAL_COLOURS, color, palette, surveyColour } from "../../lib/palette";
import { roleLabel, yearLabel } from "../../data/members";
import { ACCESSORIES } from "../../data/looks";
import { api } from "../api";
import { Button, ConfirmButton, Field, ItemList } from "../ui";
import { moved, useAction, useForm } from "../hooks";

// Two swatch rows: the original character colours, then the survey's exact shades.
const SURVEY_SHADES = Object.keys(palette).filter((k) => k !== "ink" && !ORIGINAL_COLOURS.includes(k));
const COLOUR_ROWS = [
  ["Original", ORIGINAL_COLOURS],
  ["Survey shades", SURVEY_SHADES],
];

// Accessory spots and the extras an admin can give (★), from the shared catalog.
const SLOTS = [
  ["head", "Head"],
  ["face", "Face"],
  ["mustache", "Mustache"],
  ["mouth", "Mouth"],
  ["beside", "Beside"],
];
const SLOT_OF = Object.fromEntries(ACCESSORIES.map((a) => [a.id, a.slot]));
const EXTRAS = ACCESSORIES.filter((a) => !a.starter);

export default function MembersSection({ data, reload }) {
  const [selected, setSelected] = useState(null); // member id, "new", or null
  const [query, setQuery] = useState("");
  const [, run] = useAction();
  const picks = useSurveyColours();
  const [suggested, setSuggested] = useState({});
  const [looks, setLooks] = useState({});
  const loadSuggested = () => {
    api("/admin/members/bio-suggestions")
      .then((d) => setSuggested(d.counts))
      .catch(() => {});
    api("/admin/members/look-suggestions")
      .then((d) => setLooks(d.counts))
      .catch(() => {});
  };
  useEffect(() => {
    loadSuggested();
  }, [data]);

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
                <Character type={m.avatar.char} body={color(m.avatar.body)} wear={m.avatar.wear} />
              </span>
              <span className="adm-list__text">
                <span lang={/[؀-ۿ]/.test(m.name) ? "ar" : undefined}>{m.name}</span>
                <span className="adm-muted adm-small">
                  {roleLabel[m.role]} · {m.major} · {yearLabel(m.year)}
                  {suggested[m.id] ? <strong> · {suggested[m.id]} new bio{suggested[m.id] > 1 ? "s" : ""}</strong> : null}
                  {looks[m.id] ? <strong> · {looks[m.id]} new look{looks[m.id] > 1 ? "s" : ""}</strong> : null}
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
            onHistoryCleared={loadSuggested}
            onLooksChanged={() => reload().then(loadSuggested)}
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

/* Bios suggested for this member from their profile card, newest first. Nothing
   goes live on its own: "Use this" puts one in the Bio field, then Save changes. */
function BioHistory({ memberId, current, onUse, onCleared }) {
  const [edits, setEdits] = useState(null);
  const [busy, run] = useAction();
  useEffect(() => {
    api(`/admin/members/${encodeURIComponent(memberId)}/bio-edits`)
      .then((d) => setEdits(d.edits))
      .catch(() => setEdits([]));
  }, [memberId]);
  if (!edits?.length) return null;
  const fresh = edits.filter((e) => e.isNew).length;
  const clear = () =>
    run(() => api(`/admin/members/${encodeURIComponent(memberId)}/bio-edits`, { method: "DELETE" }), "Bio history cleared").then((ok) => {
      if (ok === undefined) return;
      setEdits([]);
      onCleared();
    });
  return (
    <details className="adm-field adm-field--wide adm-bio-log" open={fresh > 0}>
      <summary className="adm-field__label">
        Bio suggestions · {edits.length} from the site{fresh ? `, ${fresh} new` : ""}
      </summary>
      <ol>
        {edits.map((e) => (
          <li key={e.id}>
            <span className="adm-muted adm-small">
              {e.isNew && <strong>New · </strong>}
              {new Date(`${e.createdAt.replace(" ", "T")}Z`).toLocaleString()}
            </span>
            <p dir="auto">{e.bio}</p>
            {e.bio === current.trim() ? (
              <span className="adm-muted adm-small">In the Bio field</span>
            ) : (
              <Button onClick={() => onUse(e.bio)}>Use this</Button>
            )}
          </li>
        ))}
      </ol>
      <ConfirmButton onConfirm={clear} disabled={busy}>
        Clear history
      </ConfirmButton>
    </details>
  );
}

/* Looks suggested for this member from their profile, newest first. Approve
   checks them against their badges again and puts the look on straight away. */
function LookHistory({ member, current, onApproved, onChanged }) {
  const [edits, setEdits] = useState(null);
  const [version, setVersion] = useState(0); // bumped to fetch the list again
  const [busy, run] = useAction();
  const path = `/admin/members/${encodeURIComponent(member.id)}/look-edits`;
  useEffect(() => {
    api(path)
      .then((d) => setEdits(d.edits))
      .catch(() => setEdits([]));
  }, [path, version]);
  const load = () => setVersion((n) => n + 1);
  if (!edits?.length) return null;
  const pending = edits.filter((e) => e.status === "pending").length;

  const approve = (e) =>
    run(() => api(`${path}/${e.id}/approve`, { method: "POST" }), "Look approved: it's live").then((ok) => {
      if (ok === undefined) return;
      load();
      onApproved(e);
    });
  const discard = (e) =>
    run(() => api(`${path}/${e.id}/discard`, { method: "POST" }), "Discarded").then((ok) => {
      if (ok === undefined) return;
      load();
      onChanged();
    });
  const clear = () =>
    run(() => api(path, { method: "DELETE" }), "Look history cleared").then((ok) => {
      if (ok === undefined) return;
      setEdits([]);
      onChanged();
    });

  return (
    <details className="adm-fieldset adm-bio-log adm-looks" open={pending > 0}>
      <summary className="adm-field__label">
        Look suggestions · {edits.length} from the site{pending ? `, ${pending} waiting` : ""}
      </summary>
      <ol>
        {edits.map((e) => (
          <li key={e.id}>
            <span className="adm-muted adm-small">
              {e.status === "pending" ? <strong>Waiting · </strong> : `${e.status === "approved" ? "Approved" : "Discarded"} · `}
              {new Date(`${e.createdAt.replace(" ", "T")}Z`).toLocaleString()}
            </span>
            <span className="adm-looks__pair">
              <span className="adm-looks__char" title="Now">
                <Character type={current.char} body={color(current.body)} wear={current.wear} />
              </span>
              <span aria-hidden="true">→</span>
              <span className="adm-looks__char" title="Suggested">
                <Character type={e.char} body={color(e.body)} wear={e.wear} />
              </span>
              <span className="adm-small">
                {e.char} · {e.body}
                {e.wear.length ? ` · ${e.wear.map((id) => ACCESSORIES.find((a) => a.id === id)?.name ?? id).join(", ")}` : ""}
              </span>
            </span>
            {e.status === "pending" && (
              <span className="adm-actions">
                <Button variant="primary" onClick={() => approve(e)} disabled={busy}>
                  Approve
                </Button>
                <Button onClick={() => discard(e)} disabled={busy}>
                  Discard
                </Button>
              </span>
            )}
          </li>
        ))}
      </ol>
      <ConfirmButton onConfirm={clear} disabled={busy}>
        Clear history
      </ConfirmButton>
    </details>
  );
}

function MemberForm({ member, badges, surveyPick, onSaved, onDeleted, onHistoryCleared, onLooksChanged }) {
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
    wear: member?.avatar.wear ?? [],
    accessories: member?.accessories ?? [],
  });
  const [busy, run] = useAction();

  const save = (e) => {
    e.preventDefault();
    const { id, char, body, wear, ...rest } = v;
    const payload = { ...rest, year: Number(v.year), avatar: { char, body, wear } };
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
  const toggleAccessory = (id) => set("accessories", v.accessories.includes(id) ? v.accessories.filter((a) => a !== id) : [...v.accessories, id]);
  // One accessory per spot: picking one swaps out whatever was in that spot.
  const putOn = (slot, id) => set("wear", [...v.wear.filter((w) => SLOT_OF[w] !== slot), ...(id ? [id] : [])]);
  // An approved look is already saved; mirror it here so the next Save doesn't undo it.
  const approved = (look) => {
    set("char", look.char);
    set("body", look.body);
    set("wear", look.wear);
    onLooksChanged();
  };

  return (
    <form className="adm-form" onSubmit={save}>
      <div className="adm-form__head">
        <div className="adm-preview">
          <Character type={v.char} body={color(v.body)} wear={v.wear} />
        </div>
        <div>
          <h2>{isNew ? "New member" : member.name}</h2>
          {!isNew && (
            <p className="adm-form__links adm-small">
              <a className="adm-link" href={`/#member/${member.id}`} target="_blank" rel="noopener">
                Open their profile ↗
              </a>
              {/* Admin only: their answers and stats from the members survey. */}
              <a className="adm-link" href={`#/survey/people/${encodeURIComponent(member.id)}`}>
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
        {!isNew && <BioHistory memberId={member.id} current={v.bio} onUse={(bio) => set("bio", bio)} onCleared={onHistoryCleared} />}
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
              <Character type={ch} body={color(v.body)} wear={v.wear} />
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
        <legend>Accessories</legend>
        <p className="adm-muted adm-small">
          What they wear. You can pick anything here, whatever their badges; members suggesting a look from the site are held to
          their badges. An extra only stays on while it's given to them (below).
        </p>
        {SLOTS.map(([slot, label]) => {
          const on = v.wear.find((w) => SLOT_OF[w] === slot) ?? null;
          return (
            <div key={slot} className="adm-swatch-row">
              <span className="adm-muted adm-small">{label}</span>
              <div className="adm-chips" role="radiogroup" aria-label={`${label} accessory`}>
                <button type="button" role="radio" aria-checked={!on} className={`adm-chip${!on ? " is-on" : ""}`} onClick={() => putOn(slot, null)}>
                  None
                </button>
                {ACCESSORIES.filter((a) => a.slot === slot).map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    role="radio"
                    aria-checked={on === a.id}
                    className={`adm-chip${on === a.id ? " is-on" : ""}`}
                    onClick={() => putOn(slot, a.id)}
                  >
                    {a.name}
                    {!a.starter && " ★"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div className="adm-swatch-row">
          <span className="adm-muted adm-small">Given to them</span>
          <div className="adm-chips">
            {EXTRAS.map((a) => (
              <label key={a.id} className={`adm-chip${v.accessories.includes(a.id) ? " is-on" : ""}`}>
                <input type="checkbox" checked={v.accessories.includes(a.id)} onChange={() => toggleAccessory(a.id)} />★ {a.name}
              </label>
            ))}
          </div>
        </div>
      </fieldset>
      {!isNew && <LookHistory member={member} current={{ char: v.char, body: v.body, wear: v.wear }} onApproved={approved} onChanged={onLooksChanged} />}

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
