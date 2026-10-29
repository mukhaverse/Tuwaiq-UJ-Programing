import { useState } from "react";
import Character from "../character/Character";
import Pill from "../ui/Pill";
import { ACCESSORIES, COLOURS, allowedChanges, canWear, sameLook, shapesFor } from "../../data/looks";
import { color, palette } from "../../lib/palette";

const SLOTS = [
  ["head", "Head"],
  ["face", "Face"],
  ["mustache", "Mustache"],
  ["mouth", "Mouth"],
  ["beside", "Beside"],
];

async function sendLook(id, look) {
  const res = await fetch(`/api/looks/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(look),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't send it. Try again in a moment.");
}

/* A small pixel padlock, like the journey's locked steps. */
function Lock() {
  return (
    <svg viewBox="0 0 10 12" className="look__lock" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M3 1h4v1H3zM2 2h1v3H2zM7 2h1v3H7zM1 5h8v6H1z" fill="currentColor" />
    </svg>
  );
}

function Section({ title, locked, hint, children }) {
  return (
    <section className={`look__section${locked ? " is-locked" : ""}`}>
      <h4 className="look__title mono">
        {locked && <Lock />}
        {title}
      </h4>
      {hint && <p className="look__hint mono">{hint}</p>}
      {children}
    </section>
  );
}

/* The Customize panel on a profile. What can change depends on the member's
   badges (src/data/looks.ts); locked parts show in full, padlocked, so people
   see what's next. Saving puts the look live straight away. */
export default function LookEditor({ member, draft, onDraft, onDone }) {
  const badges = member.badges.length;
  const tier = allowedChanges(badges);
  const current = { char: member.avatar.char, body: member.avatar.body, wear: member.avatar.wear ?? [] };
  const canShape = tier !== "none";
  const canAll = tier === "all";
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Starters always show (locked below 2 badges); extras only for whoever was given them.
  const shown = ACCESSORIES.filter((a) => a.starter || member.accessories?.includes(a.id) || current.wear.includes(a.id));
  const slotOf = Object.fromEntries(ACCESSORIES.map((a) => [a.id, a.slot]));
  // One badge opens the hats; two open every spot.
  const slotOpen = (slot) => canAll || (canShape && slot === "head");
  const unlocked = (id) => slotOpen(slotOf[id]) && (current.wear.includes(id) || canWear({ badges, accessories: member.accessories ?? [] }, id));
  const put = (slot, id) => onDraft({ ...draft, wear: [...draft.wear.filter((w) => slotOf[w] !== slot), ...(id ? [id] : [])] });

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await sendLook(member.id, draft);
      onDone(true);
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  return (
    <div className="look">
      <p className="modal__label mono">Customize</p>

      <Section title="Shape" locked={!canShape} hint={!canShape && "Earn 1 badge to change your shape and wear a hat"}>
        <div className="look__tiles">
          {shapesFor(member.role).map((s) => (
            <button
              type="button"
              key={s}
              className="look__tile"
              aria-pressed={draft.char === s}
              disabled={!canShape}
              onClick={() => onDraft({ ...draft, char: s })}
              title={s}
              aria-label={s}
            >
              <Character type={s} body={color(draft.body)} />
              {!canShape && <Lock />}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Colour" locked={!canAll} hint={!canAll && "Earn 2 badges to unlock colours and accessories"}>
        <div className="look__swatches">
          {COLOURS.map((k) => (
            <button
              type="button"
              key={k}
              className="look__swatch"
              style={{ background: palette[k] }}
              aria-pressed={draft.body === k}
              disabled={!canAll}
              onClick={() => onDraft({ ...draft, body: k })}
              title={k}
              aria-label={k}
            />
          ))}
        </div>
      </Section>

      <Section title="Accessories" locked={!canAll} hint={canShape && !canAll && "Hats are yours! The rest unlock at 2 badges"}>
        {SLOTS.map(([slot, label]) => {
          const items = shown.filter((a) => a.slot === slot);
          const on = draft.wear.find((w) => slotOf[w] === slot) ?? null;
          return (
            <div key={slot} className="look__row">
              <span className="look__slot mono">{label}</span>
              <div className="look__tiles">
                <button type="button" className="look__tile look__tile--none mono" aria-pressed={!on} disabled={!slotOpen(slot)} onClick={() => put(slot, null)}>
                  None
                </button>
                {items.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    className="look__tile"
                    aria-pressed={on === a.id}
                    disabled={!unlocked(a.id)}
                    onClick={() => put(slot, a.id)}
                    title={a.name}
                    aria-label={a.name}
                  >
                    <Character type={draft.char} body={color(draft.body)} wear={[a.id]} />
                    {!unlocked(a.id) && <Lock />}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </Section>

      {error && <p className="modal__error">{error}</p>}
      <div className="look__actions">
        <Pill as="button" type="button" variant="accent" onClick={send} disabled={sending || !canShape || sameLook(draft, current)}>
          {sending ? "Saving…" : "Save look"}
        </Pill>
        <button type="button" className="modal__edit mono" onClick={() => onDone(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
