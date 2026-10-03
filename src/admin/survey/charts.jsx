// Charts for the survey: plain HTML/CSS, no chart library. Every bar is labelled
// with its count and opens to show who's behind it, so nothing hides in a tooltip.
import { useState } from "react";
import Character from "../../components/character/Character";
import { useToast } from "../hooks";
import { Button } from "../ui";
import { color } from "../../lib/palette";
import { isArabic } from "./model";
import { LEVEL_COLORS, LEVEL_NAMES, REST_COLOR, SPLIT_COLORS, displayName, pct, personHref } from "./format";

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
export function PeopleChips({ people, empty = "Nobody", limit }) {
  const [all, setAll] = useState(false);
  if (!people.length) return <p className="adm-muted adm-small srv-chips__empty">{empty}</p>;
  const shown = limit && !all ? people.slice(0, limit) : people;
  return (
    <ul className="srv-chips">
      {shown.map((p) => (
        <li key={p.key}>
          <a className="srv-chip" href={personHref(p)}>
            <Avatar person={p} size={20} />
            <Txt>{displayName(p)}</Txt>
          </a>
        </li>
      ))}
      {limit && people.length > limit && (
        <li>
          <button type="button" className="srv-chip srv-chip--more" onClick={() => setAll(!all)}>
            {all ? "Show fewer" : `+${people.length - limit} more`}
          </button>
        </li>
      )}
    </ul>
  );
}

/** A card. `eyebrow` names the question; `title` says what the answers show. */
export function Card({ eyebrow, title, note, children, wide = false, className = "" }) {
  return (
    <section className={`srv-card${wide ? " srv-card--wide" : ""} ${className}`}>
      <header className="srv-card__head">
        {eyebrow && <p className="srv-card__eyebrow">{eyebrow}</p>}
        <h3>{title}</h3>
        {note && <p className="adm-muted adm-small">{note}</p>}
      </header>
      {children}
    </section>
  );
}

/** A titled group of cards on the overview. */
export function Chapter({ id, title, lead, children }) {
  return (
    <section className="srv-chapter" id={`srv-${id}`} aria-labelledby={`srv-${id}-title`}>
      <header className="srv-chapter__head">
        <h2 id={`srv-${id}-title`}>{title}</h2>
        {lead && <p className="adm-muted">{lead}</p>}
      </header>
      <div className="srv-grid">{children}</div>
    </section>
  );
}

/** One big number with what it means: for answers where one option dominates. */
export function BigStat({ value, label, note, people }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="srv-bigstat">
      <span className="srv-bigstat__value">{value}</span>
      <span className="srv-bigstat__label">{label}</span>
      {note && <span className="adm-muted adm-small">{note}</span>}
      {people && (
        <>
          <button type="button" className="srv-more" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? "Hide names" : "Show names"}
          </button>
          {open && <PeopleChips people={people} />}
        </>
      )}
    </div>
  );
}

/**
 * Part-to-whole for a one-answer question: a single bar split by answer, with a
 * legend that carries the names, counts and percentages. Click a legend row for who.
 */
export function SplitBar({ items, total }) {
  const [open, setOpen] = useState(null);
  const shown = items.filter((i) => i.count);
  const main = shown.slice(0, SPLIT_COLORS.length);
  const rest = shown.slice(SPLIT_COLORS.length);
  const parts = [
    ...main.map((i, n) => ({ ...i, color: SPLIT_COLORS[n] })),
    ...(rest.length ? [{ label: "Other answers", count: rest.reduce((s, i) => s + i.count, 0), people: rest.flatMap((i) => i.people), color: REST_COLOR }] : []),
  ];
  const sum = parts.reduce((s, p) => s + p.count, 0);
  if (!sum) return <p className="adm-muted adm-small">No answers yet.</p>;
  return (
    <div className="srv-split">
      <div className="srv-split__bar" role="img" aria-label={parts.map((p) => `${p.label}: ${p.count}`).join(", ")}>
        {parts.map((p) => (
          <span key={p.label} style={{ flexGrow: p.count, background: p.color }} title={`${p.label}: ${p.count}`} />
        ))}
      </div>
      <ul className="srv-split__legend">
        {parts.map((p) => {
          const isOpen = open === p.label;
          return (
            <li key={p.label}>
              <button type="button" onClick={() => setOpen(isOpen ? null : p.label)} aria-expanded={isOpen}>
                <span className="srv-legend__key" style={{ background: p.color }} />
                <Txt className="srv-split__label">{p.label}</Txt>
                <span className="srv-split__num">
                  {pct(p.count, total)}%<span className="adm-muted"> · {p.count}</span>
                </span>
              </button>
              {isOpen && <PeopleChips people={p.people} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Ranked answers as pills, each shaded by how many picked it: compact for long lists. */
export function ChipCloud({ items, total }) {
  const [open, setOpen] = useState(null);
  const max = Math.max(1, ...items.map((i) => i.count));
  const current = items.find((i) => i.label === open);
  return (
    <div className="srv-cloud">
      <ul className="srv-cloud__list">
        {items.map((i) => (
          <li key={i.label}>
            <button
              type="button"
              className={`srv-cloud__chip${open === i.label ? " is-open" : ""}`}
              style={{ "--fill": `${(i.count / max) * 100}%` }}
              onClick={() => setOpen(open === i.label ? null : i.label)}
              aria-expanded={open === i.label}
              title={`${i.count} of ${total} (${pct(i.count, total)}%)`}
            >
              <Txt>{i.label}</Txt>
              <span className="srv-cloud__count">{i.count}</span>
            </button>
          </li>
        ))}
      </ul>
      {current && <PeopleChips people={current.people} />}
    </div>
  );
}

/** Time slots as tiles: how many of everyone can make each one. */
export function SlotTiles({ items, total }) {
  const [open, setOpen] = useState(null);
  const current = items.find((i) => i.label === open);
  return (
    <div className="srv-slots">
      <ul className="srv-slots__list">
        {items.map((i, n) => (
          <li key={i.label}>
            <button type="button" className={`srv-slot${n === 0 ? " is-best" : ""}${open === i.label ? " is-open" : ""}`} onClick={() => setOpen(open === i.label ? null : i.label)} aria-expanded={open === i.label}>
              {n === 0 && <span className="srv-slot__best">Best</span>}
              <span className="srv-slot__value">
                {i.count}
                <span className="adm-muted">/{total}</span>
              </span>
              <span className="srv-slot__label">{i.label}</span>
              <span className="srv-slot__track">
                <span style={{ width: `${pct(i.count, total)}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {current && <PeopleChips people={current.people} />}
    </div>
  );
}

/** Vertical columns for an ordered scale (like academic year). */
export function Columns({ items, total }) {
  const [open, setOpen] = useState(null);
  const max = Math.max(1, ...items.map((i) => i.count));
  const current = items.find((i) => i.label === open);
  return (
    <div className="srv-cols">
      <div className="srv-cols__plot">
        {items.map((i) => (
          <button key={i.label} type="button" className={`srv-col${open === i.label ? " is-open" : ""}`} onClick={() => setOpen(open === i.label ? null : i.label)} aria-expanded={open === i.label} aria-label={`${i.label}: ${i.count}`}>
            <span className="srv-col__value">{i.count}</span>
            <span className="srv-col__bar" style={{ height: `${(i.count / max) * 100}%` }} />
            <span className="srv-col__label">{i.label}</span>
          </button>
        ))}
      </div>
      {current && (
        <>
          <p className="adm-muted adm-small">
            {current.label}: {current.count} ({pct(current.count, total)}%)
          </p>
          <PeopleChips people={current.people} />
        </>
      )}
    </div>
  );
}

/** Favorite colors as one strip in the colors themselves. */
export function ColorStrip({ items }) {
  return (
    <div className="srv-split">
      <div className="srv-split__bar srv-split__bar--colors" role="img" aria-label={items.map((c) => `${c.label}: ${c.count}`).join(", ")}>
        {items.map((c) => (
          <span key={c.label} style={{ flexGrow: c.count, background: c.hex ?? REST_COLOR }} title={`${c.label}: ${c.count}`} />
        ))}
      </div>
      <ul className="srv-colors">
        {items.map((c) => (
          <li key={c.label} title={c.people.map(displayName).join(", ")}>
            <span className="srv-colors__swatch" style={{ background: c.hex ?? "transparent" }} />
            <span>{c.label}</span>
            <span className="adm-muted">{c.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Groups of people shown as a row of their characters, with a count. */
export function TierTiles({ tiers, total }) {
  const [open, setOpen] = useState(null);
  const current = tiers.find((t) => t.id === open);
  return (
    <div className="srv-tiers">
      <ul className="srv-tiers__list">
        {tiers.map((t, n) => (
          <li key={t.id}>
            <button type="button" className={`srv-tiertile${open === t.id ? " is-open" : ""}`} onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id}>
              <span className="srv-tiertile__key" style={{ background: LEVEL_COLORS[[0, 2, 3][n] ?? 3] }} />
              <span className="srv-tiertile__value">{t.count}</span>
              <span className="srv-tiertile__label">{t.label}</span>
              <span className="adm-muted adm-small">{pct(t.count, total)}% of people</span>
              <span className="srv-tiertile__faces" aria-hidden="true">
                {t.people.slice(0, 8).map((p) => (
                  <Avatar key={p.key} person={p} size={22} />
                ))}
                {t.people.length > 8 && <span className="adm-muted adm-small">+{t.people.length - 8}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {current && <PeopleChips people={current.people} />}
    </div>
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
            {isOpen && (
              <a className="adm-link adm-small srv-scale__more" href={`#admin/survey/questions/${s.id}`}>
                Full stats and breakdown for {s.label} →
              </a>
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

/** Copies people's names, one per line (to paste into a group chat or a message). */
export function CopyNames({ people, label = "Copy names" }) {
  const toast = useToast();
  const copy = () =>
    navigator.clipboard.writeText(people.map(displayName).join("\n")).then(
      () => toast(`Copied ${people.length} ${people.length === 1 ? "name" : "names"}`),
      () => toast("Couldn't copy", "error")
    );
  return (
    <Button className="srv-copy" onClick={copy} disabled={!people.length}>
      {label}
    </Button>
  );
}

/** Every answer to one question: count, share, who, and a button to copy their names. */
export function AnswerTable({ items, total, levels = false }) {
  if (!items.length) return <p className="adm-muted adm-small">No answers yet.</p>;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="srv-answers">
      <table className="srv-table">
        <thead>
          <tr>
            <th scope="col">Answer</th>
            <th scope="col">People</th>
            <th scope="col">Who</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, n) => (
            <tr key={item.label}>
              <th scope="row">
                {levels && <span className="srv-legend__key" style={{ background: LEVEL_COLORS[n] }} />}
                {levels && `${n + 1}. `}
                <Txt>{item.label}</Txt>
              </th>
              <td className="srv-table__num">
                <strong>{item.count}</strong> <span className="adm-muted">· {pct(item.count, total)}%</span>
                <span className="srv-answers__bar">
                  <span style={{ width: `${(item.count / max) * 100}%` }} />
                </span>
              </td>
              <td>
                <div className="srv-answers__who">
                  <PeopleChips people={item.people} limit={6} empty="—" />
                  {item.people.length > 0 && <CopyNames people={item.people} label="Copy" />}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A skill question's levels as one bar, lowest to highest, in the level ramp. */
export function LevelSplit({ items, total }) {
  return (
    <div className="srv-split">
      <div className="srv-split__bar" role="img" aria-label={items.map((i) => `${i.label}: ${i.count}`).join(", ")}>
        {items.map((i, n) =>
          i.count ? <span key={i.label} style={{ flexGrow: i.count, background: LEVEL_COLORS[n] }} title={`${n + 1}. ${i.label}: ${i.count}`} /> : null
        )}
      </div>
      <ul className="srv-split__legend srv-split__legend--static">
        {items.map((i, n) => (
          <li key={i.label}>
            <span className="srv-legend__key" style={{ background: LEVEL_COLORS[n] }} />
            <span className="srv-split__label">
              {n + 1}. {i.label}
            </span>
            <span className="srv-split__num">
              {pct(i.count, total)}%<span className="adm-muted"> · {i.count}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A question's answers split by a kind of person (rows: answers, columns: groups).
 * Cells show what share of that group gave the answer, shaded darker for more, so
 * groups of different sizes compare fairly. Click a cell for who.
 */
export function Heatmap({ data, multi }) {
  const [open, setOpen] = useState(null);
  const current = open && data.rows[open.r]?.cells[open.c];
  if (!data.columns.length) return <p className="adm-muted adm-small">Not enough answers to compare.</p>;
  return (
    <div className="srv-heat">
      <div className="srv-heat__scroll">
        <table className="srv-heat__table">
          <thead>
            <tr>
              <th scope="col">
                <span className="srv-sr">Answer</span>
              </th>
              {data.columns.map((c) => (
                <th scope="col" key={c.label}>
                  <Txt>{c.label}</Txt>
                  <span className="adm-muted"> ({c.size})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, r) => (
              <tr key={row.label}>
                <th scope="row">
                  <Txt>{row.label}</Txt>
                </th>
                {row.cells.map((cell, c) => {
                  const share = pct(cell.length, data.columns[c].size);
                  const isOpen = open?.r === r && open?.c === c;
                  return (
                    <td key={c}>
                      <button
                        type="button"
                        className={`srv-heat__cell${isOpen ? " is-open" : ""}`}
                        style={{ "--share": `${share}%` }}
                        onClick={() => setOpen(isOpen ? null : { r, c })}
                        aria-label={`${row.label}, ${data.columns[c].label}: ${cell.length} of ${data.columns[c].size}`}
                        aria-expanded={isOpen}
                        disabled={!cell.length}
                      >
                        <span className="srv-heat__pct">{cell.length ? `${share}%` : "–"}</span>
                        {cell.length > 0 && <span className="srv-heat__n">{cell.length}</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="adm-muted adm-small">
        Each cell: the share of that column's people who {multi ? "picked" : "gave"} the answer (count underneath). Darker means more.
        {multi && " People could pick several, so columns add up to more than 100%."}
      </p>
      {current && (
        <div className="srv-heat__who">
          <p className="adm-small">
            <strong>
              <Txt>{data.rows[open.r].label}</Txt>
            </strong>{" "}
            · <Txt>{data.columns[open.c].label}</Txt>
          </p>
          <PeopleChips people={current} />
        </div>
      )}
    </div>
  );
}

/** Responses per day as columns, with the running total under each day. */
export function Timeline({ days, total }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  const label = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return (
    <div className="srv-cols">
      <div className="srv-cols__plot">
        {days.map((d) => (
          <div key={d.day} className="srv-col" title={d.people.map(displayName).join(", ")}>
            <span className="srv-col__value">+{d.count}</span>
            <span className="srv-col__bar" style={{ height: `${(d.count / max) * 100}%` }} />
            <span className="srv-col__label">{label(d.day)}</span>
          </div>
        ))}
      </div>
      <p className="adm-muted adm-small">
        Running total: {days.map((d) => `${d.total}/${total}`).join(" → ")}
      </p>
    </div>
  );
}
