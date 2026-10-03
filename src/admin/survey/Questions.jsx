// Every survey question on its own page: the right chart for it, every answer
// with who gave it, written-in answers, and a breakdown by kind of person.
// Step through with the arrows (or ← →), or jump from the list.
import { useEffect, useState } from "react";
import {
  AnswerTable,
  BarList,
  BigStat,
  Card,
  ColorStrip,
  Columns,
  CopyNames,
  Heatmap,
  LevelSplit,
  SlotTiles,
  SplitBar,
  Txt,
} from "./charts";
import { DIMENSIONS, QUESTION_GROUPS, breakdown } from "./model";
import { displayName, pct, personHref, questionHref } from "./format";

const KIND_NOTE = {
  scale: "Skill question: 4 answers, from least to most experienced.",
  single: "One answer each.",
  multi: "Pick several: percentages are of people, so they add up to more than 100%.",
  text: "Written answers, in their own words.",
};

// A question can't be split by itself (role by role, year by year…).
const SAME = { role: "role", format: "format", year: "year", major: "major" };

export default function Questions({ questions, people, stats, id }) {
  const at = Math.max(0, questions.findIndex((q) => q.id === id));
  const q = questions[at];
  const prev = questions[at - 1];
  const next = questions[at + 1];

  // ← and → step through the questions (unless you're typing somewhere).
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const to = e.key === "ArrowLeft" ? prev : e.key === "ArrowRight" ? next : null;
      if (to) window.location.hash = questionHref(to.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  // Each question opens at the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [q.id]);

  return (
    <div className="srv-qs">
      <QuestionNav questions={questions} current={q} />

      <div className="srv-q">
        <header className="srv-q__head">
          <div>
            <p className="srv-card__eyebrow">
              Question {at + 1} of {questions.length} · {q.group}
            </p>
            <h2>{q.label}</h2>
            <p className="adm-muted adm-small">
              {KIND_NOTE[q.kind]} Answered by {q.answered} of {people.length}.
            </p>
          </div>
          <div className="srv-q__step">
            {prev ? (
              <a className="adm-btn" href={questionHref(prev.id)} title={prev.label}>
                ← Previous
              </a>
            ) : (
              <span className="adm-btn is-disabled" aria-disabled="true">
                ← Previous
              </span>
            )}
            {next ? (
              <a className="adm-btn adm-btn--primary" href={questionHref(next.id)} title={next.label}>
                Next →
              </a>
            ) : (
              <span className="adm-btn is-disabled" aria-disabled="true">
                Next →
              </span>
            )}
          </div>
        </header>

        {q.kind === "text" ? <TextQuestion q={q} people={people} /> : <ChoiceQuestion key={q.id} q={q} people={people} stats={stats} />}

        {next && (
          <a className="srv-q__next" href={questionHref(next.id)}>
            <span className="adm-muted adm-small">Next question</span>
            <span>{next.label} →</span>
          </a>
        )}
      </div>
    </div>
  );
}

function QuestionNav({ questions, current }) {
  let n = 0;
  return (
    <nav className="srv-qnav" aria-label="Questions">
      {/* Phones: a dropdown instead of the list. */}
      <select
        id="srv-question-pick"
        className="srv-qnav__select"
        aria-label="Question"
        value={current.id}
        onChange={(e) => (window.location.hash = questionHref(e.target.value))}
      >
        {questions.map((q, i) => (
          <option key={q.id} value={q.id}>
            {i + 1}. {q.label}
          </option>
        ))}
      </select>
      <div className="srv-qnav__list">
        {QUESTION_GROUPS.map((group) => {
          const inGroup = questions.filter((q) => q.group === group);
          if (!inGroup.length) return null;
          return (
            <div key={group} className="srv-qnav__group">
              <p className="srv-qnav__title">{group}</p>
              <ol>
                {inGroup.map((q) => {
                  n++;
                  return (
                    <li key={q.id}>
                      <a href={questionHref(q.id)} aria-current={q.id === current.id ? "page" : undefined}>
                        <span className="srv-qnav__n">{n}</span>
                        <span>{q.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function ChoiceQuestion({ q, people, stats }) {
  const total = people.length;
  const answered = q.items.filter((i) => i.count);
  const top = [...answered].sort((a, b) => b.count - a.count).find((i) => i.label !== "Other");
  const dims = DIMENSIONS.filter((d) => SAME[q.id] !== d.id);
  const [dimId, setDimId] = useState(dims[0].id);
  const dim = dims.find((d) => d.id === dimId) ?? dims[0];
  const split = breakdown(q, people, dim);
  const scale = q.kind === "scale" ? stats.scales.find((s) => s.id === q.id) : null;

  return (
    <div className="srv-grid">
      <Card eyebrow="At a glance" title={summary(q, top, total, scale)} wide>
        <Visual q={q} total={total} top={top} stats={stats} />
      </Card>

      <Card eyebrow="Every answer" title={`${answered.length} different ${answered.length === 1 ? "answer" : "answers"}`} note="Copy puts that group's names on your clipboard, one per line." wide>
        <AnswerTable items={q.items} total={total} levels={q.kind === "scale"} />
      </Card>

      {q.others.length > 0 && (
        <Card eyebrow={`Typed under "Other"`} title={`${q.others.length} written-in ${q.others.length === 1 ? "answer" : "answers"}`} wide>
          <ul className="srv-quotes">
            {q.others.map((o, i) => (
              <li key={i}>
                <Txt as="blockquote">{o.text}</Txt>
                <p className="adm-small">
                  <a className="adm-link" href={personHref(o.person)}>
                    <Txt>{displayName(o.person)}</Txt>
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {answered.length > 1 && (
        <Card eyebrow="Break it down" title={`${q.label}, by ${dim.label.toLowerCase()}`} wide>
          <div className="srv-dims" role="radiogroup" aria-label="Break down by">
            {dims.map((d) => (
              <button key={d.id} type="button" role="radio" aria-checked={d.id === dim.id} className="srv-dim" onClick={() => setDimId(d.id)}>
                {d.label}
              </button>
            ))}
          </div>
          <Heatmap data={split} multi={q.kind === "multi"} />
        </Card>
      )}
    </div>
  );
}

/** The chart that suits the question. */
function Visual({ q, total, top, stats }) {
  if (q.kind === "scale") return <LevelSplit items={q.items} total={total} />;
  if (q.id === "year") return <Columns items={q.items} total={total} />;
  if (q.id === "color") return <ColorStrip items={q.items.map((c) => ({ ...c, hex: c.people.find((p) => p.color?.hex)?.color.hex ?? null }))} />;
  if (q.id === "times")
    return (
      <>
        <p className="adm-muted adm-small">Who can make each time: the slots they picked plus the {stats.anyTime} who said any time works.</p>
        <SlotTiles items={stats.availability} total={total} />
      </>
    );
  if (q.kind === "multi") return <BarList items={q.items} total={total} />;
  // One answer each: a single big number when one answer clearly dominates.
  if (top && top.count / total >= 0.75)
    return (
      <div className="srv-q__dominant">
        <BigStat value={`${pct(top.count, total)}%`} label={`chose "${top.label}"`} />
        <SplitBar items={q.items} total={total} />
      </div>
    );
  return <SplitBar items={q.items} total={total} />;
}

function summary(q, top, total, scale) {
  if (scale?.average != null) {
    const avg = scale.average + 1;
    return `Average level ${avg.toFixed(1)} of 4. Most common: "${top?.label}" (${pct(top?.count ?? 0, total)}%)`;
  }
  if (!top) return q.label;
  if (q.kind === "multi") return `${top.label} is picked most, by ${pct(top.count, total)}% of people`;
  return `Most common: "${top.label}", ${pct(top.count, total)}% of people`;
}

function TextQuestion({ q, people }) {
  const [query, setQuery] = useState("");
  const entries = people.filter((p) => q.textOf(p)).map((p) => ({ person: p, text: q.textOf(p) }));
  const s = query.trim().toLowerCase();
  const shown = s ? entries.filter((e) => `${e.text} ${displayName(e.person)}`.toLowerCase().includes(s)) : entries;
  return (
    <div className="srv-grid">
      <Card eyebrow="Every answer" title={`${entries.length} written ${entries.length === 1 ? "answer" : "answers"}`} wide>
        <div className="srv-q__tools">
          <input id="srv-text-search" type="search" placeholder="Search the answers" value={query} onChange={(e) => setQuery(e.target.value)} />
          <CopyNames people={shown.map((e) => e.person)} label="Copy these names" />
        </div>
        {shown.length ? (
          <ul className="srv-quotes">
            {shown.map((e) => (
              <li key={e.person.key}>
                <Txt as="blockquote">{e.text}</Txt>
                <p className="adm-small">
                  <a className="adm-link" href={personHref(e.person)}>
                    <Txt>{displayName(e.person)}</Txt>
                  </a>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="adm-muted adm-small">No answers match.</p>
        )}
      </Card>
    </div>
  );
}
