// Charts for the survey: plain HTML/CSS, no chart library. Every bar is labelled
// with its count and opens to show who's behind it, so nothing hides in a tooltip.
import { useState } from "react";
import Character from "../../components/character/Character";
import { color } from "../../lib/palette";
import { isArabic } from "./model";
import { LEVEL_COLORS, LEVEL_NAMES, displayName, pct, personHref } from "./format";

/** Text that may be Arabic: right-to-left and in the Arabic font when it is. */
export function Txt({ children, as: Tag = "span", className }) {
  const ar = isArabic(typeof children === "string" ? children : "");
  return (
    <Tag className={className} lang={ar ? "ar" : undefined} dir="auto">
      {children}
    </Tag>
  );
}

export function Avatar({ person, size = 28 }) {
  const m = person.member;
  return (
    <span className="srv-avatar" style={{ width: size, height: size }} aria-hidden="true">
      {m ? <Character type={m.avatar.char} body={color(m.avatar.body)} /> : <span className="srv-avatar__blank" />}
    </span>
  );
}

/** Links to people's survey profiles. */
export function PeopleChips({ people, empty = "Nobody" }) {
  if (!people.length) return <p className="adm-muted adm-small srv-chips__empty">{empty}</p>;
  return (
    <ul className="srv-chips">
      {people.map((p) => (
        <li key={p.key}>
          <a className="srv-chip" href={personHref(p)}>
            <Avatar person={p} size={20} />
            <Txt>{displayName(p)}</Txt>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** A card with a heading. */
export function Card({ title, note, children, wide = false, className = "" }) {
  return (
    <section className={`srv-card${wide ? " srv-card--wide" : ""} ${className}`}>
      <header className="srv-card__head">
        <h3>{title}</h3>
        {note && <p className="adm-muted adm-small">{note}</p>}
      </header>
      {children}
    </section>
  );
}

export function StatTile({ label, value, note }) {
  return (
    <div className="srv-stat">
      <span className="srv-stat__label">{label}</span>
      <span className="srv-stat__value">{value}</span>
      {note && <span className="adm-muted adm-small">{note}</span>}
    </div>
  );
}

/**
 * Horizontal bars, one per answer: label, bar, "count · %". Click a row to see
 * who gave that answer. `total` is what the percentages are out of.
 */
export function BarList({ items, total, colors, limit }) {
  const [open, setOpen] = useState(null);
  const [all, setAll] = useState(false);
  const max = Math.max(1, ...items.map((i) => i.count));
  const shown = limit && !all ? items.slice(0, limit) : items;
  if (!items.length) return <p className="adm-muted adm-small">No answers yet.</p>;
  return (
    <div className="srv-bars">
      {shown.map((item, i) => {
        const isOpen = open === item.label;
        return (
          <div key={item.label} className={`srv-bar${isOpen ? " is-open" : ""}`}>
            <button type="button" className="srv-bar__row" onClick={() => setOpen(isOpen ? null : item.label)} aria-expanded={isOpen}>
              <Txt className="srv-bar__label">{item.label}</Txt>
              <span className="srv-bar__track">
                <span
                  className="srv-bar__fill"
                  style={{ width: `${(item.count / max) * 100}%`, background: colors?.[i] ?? item.color ?? undefined }}
                />
              </span>
              <span className="srv-bar__value">
                {item.count}
                <span className="adm-muted"> · {pct(item.count, total)}%</span>
              </span>
            </button>
            {isOpen && <PeopleChips people={item.people} />}
          </div>
        );
      })}
      {limit && items.length > limit && (
        <button type="button" className="srv-more" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

/** The skill questions as stacked bars, level 1 (left) to level 4 (right). Click one for the breakdown. */
export function ScaleStack({ scales }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="srv-scales">
      <ul className="srv-legend" aria-label="Levels">
        {LEVEL_NAMES.map((l, i) => (
          <li key={l}>
            <span className="srv-legend__key" style={{ background: LEVEL_COLORS[i] }} />
            {l}
            {i === 0 && <span className="adm-muted"> (lowest)</span>}
            {i === 3 && <span className="adm-muted"> (highest)</span>}
          </li>
        ))}
      </ul>
      {scales.map((s) => {
        const isOpen = open === s.id;
        return (
          <div key={s.id} className={`srv-scale${isOpen ? " is-open" : ""}`}>
            <button type="button" className="srv-scale__row" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
              <span className="srv-scale__label">
                {s.label}
                <span className="adm-muted adm-small">avg {s.average == null ? "–" : (s.average + 1).toFixed(1)} / 4</span>
              </span>
              <span className="srv-stack">
                {s.counts.map((c) =>
                  c.people.length ? (
                    <span
                      key={c.level}
                      className="srv-stack__seg"
                      style={{ flexGrow: c.people.length, background: LEVEL_COLORS[c.level], color: c.level >= 2 ? "#16181d" : "#fff" }}
                      title={`${c.label}: ${c.people.length}`}
                    >
                      {pct(c.people.length, s.answered) >= 9 ? c.people.length : ""}
                    </span>
                  ) : null
                )}
              </span>
            </button>
            {isOpen && (
              <table className="srv-table">
                <tbody>
                  {s.counts.map((c) => (
                    <tr key={c.level}>
                      <th scope="row">
                        <span className="srv-legend__key" style={{ background: LEVEL_COLORS[c.level] }} />
                        {c.level + 1}. {c.label}
                      </th>
                      <td className="srv-table__num">
                        {c.people.length} <span className="adm-muted">· {pct(c.people.length, s.answered)}%</span>
                      </td>
                      <td>
                        <PeopleChips people={c.people} empty="—" />
                      </td>
                    </tr>
                  ))}
                  {s.unmatched.length > 0 && (
                    <tr>
                      <th scope="row">Answers not on the scale</th>
                      <td className="srv-table__num">{s.unmatched.length}</td>
                      <td>
                        <PeopleChips people={s.unmatched} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A 4-step meter for one skill level. */
export function LevelMeter({ level, label }) {
  return (
    <span className="srv-meter" role="img" aria-label={level == null ? `${label}: no answer` : `${label}: level ${level + 1} of 4`}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="srv-meter__step" style={{ background: level != null && i <= level ? LEVEL_COLORS[level] : undefined }} />
      ))}
    </span>
  );
}

/** Skill score out of 100 as a bar. */
export function ScoreBar({ score }) {
  if (score == null) return <span className="adm-muted">–</span>;
  return (
    <span className="srv-score">
      <span className="srv-score__track">
        <span className="srv-score__fill" style={{ width: `${score}%` }} />
      </span>
      <span className="srv-score__num">{score}</span>
    </span>
  );
}

export function TierTag({ tier }) {
  if (!tier) return null;
  return <span className={`adm-tag srv-tier srv-tier--${tier.id}`}>{tier.label}</span>;
}
