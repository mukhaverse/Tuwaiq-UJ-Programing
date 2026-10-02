// Everyone who answered, filterable, and one profile per person with all their answers.
import { useMemo, useState } from "react";
import { yearLabel } from "../../data/members";
import { MULTIS, SCALES, SINGLES, TEXTS, TIERS } from "./model";
import { Avatar, Card, LevelMeter, ScoreBar, TierTag, Txt } from "./charts";
import { LEVEL_COLORS, displayName, personHref } from "./format";

const SORTS = {
  name: { label: "Name", fn: (a, b) => displayName(a).localeCompare(displayName(b), "ar") },
  score: { label: "Skill score, high to low", fn: (a, b) => (b.score ?? -1) - (a.score ?? -1) },
  scoreAsc: { label: "Skill score, low to high", fn: (a, b) => (a.score ?? 999) - (b.score ?? 999) },
  recent: { label: "Most recent", fn: (a, b) => b.submittedAt.localeCompare(a.submittedAt) },
};

export function PeopleList({ people, missing }) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("");
  const [role, setRole] = useState("");
  const [interest, setInterest] = useState("");
  const [sort, setSort] = useState("name");

  const roles = useMemo(() => [...new Set(people.map((p) => p.singles.role?.label).filter(Boolean))].sort(), [people]);
  const interests = useMemo(() => [...new Set(people.flatMap((p) => p.multis.interests.map((a) => a.label)))].sort(), [people]);

  const q = query.trim().toLowerCase();
  const list = people
    .filter((p) => !q || `${p.name} ${p.member?.name ?? ""} ${p.major ?? ""}`.toLowerCase().includes(q))
    .filter((p) => !tier || p.tier?.id === tier)
    .filter((p) => !role || p.singles.role?.label === role)
    .filter((p) => !interest || p.multis.interests.some((a) => a.label === interest))
    .sort(SORTS[sort].fn);

  return (
    <div className="adm-panel srv-people">
      <div className="srv-filters">
        <input id="srv-search" type="search" placeholder={`Search ${people.length} people`} value={query} onChange={(e) => setQuery(e.target.value)} />
        <select id="srv-tier" value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Level">
          <option value="">Any level</option>
          {TIERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select id="srv-role" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Preferred role">
          <option value="">Any role</option>
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select id="srv-interest" value={interest} onChange={(e) => setInterest(e.target.value)} aria-label="Interest">
          <option value="">Any interest</option>
          {interests.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select id="srv-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          {Object.entries(SORTS).map(([id, s]) => (
            <option key={id} value={id}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>
      <p className="adm-muted adm-small">
        Showing {list.length} of {people.length}. Bars are the 5 skill questions, in order: {SCALES.map((s) => s.label.toLowerCase()).join(", ")}.
      </p>

      <ul className="srv-plist">
        {list.map((p) => (
          <li key={p.key}>
            <a className="srv-prow" href={personHref(p)}>
              <Avatar person={p} size={34} />
              <span className="srv-prow__name">
                <Txt>{displayName(p)}</Txt>
                <span className="adm-muted adm-small">
                  {[p.major, p.year && yearLabel(p.year), p.singles.role?.label].filter(Boolean).join(" · ")}
                  {!p.memberId && <span className="adm-tag">Not linked</span>}
                </span>
              </span>
              <span className="srv-prow__skills">
                {SCALES.map((s) => (
                  <LevelMeter key={s.id} level={p.levels[s.id].level} label={s.label} />
                ))}
              </span>
              <span className="srv-prow__score">
                <ScoreBar score={p.score} />
                <TierTag tier={p.tier} />
              </span>
            </a>
          </li>
        ))}
        {!list.length && <li className="adm-muted">Nobody matches these filters.</li>}
      </ul>

      {missing.length > 0 && !q && !tier && !role && !interest && (
        <>
          <h3 className="srv-subhead">Haven't answered ({missing.length})</h3>
          <ul className="srv-chips">
            {missing.map((m) => (
              <li key={m.id}>
                <a className="srv-chip" href={`#admin/survey/people/${encodeURIComponent(m.id)}`}>
                  <Txt>{m.name}</Txt>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function Profile({ id, people, missing, stats }) {
  const ordered = useMemo(() => [...people].sort(SORTS.name.fn), [people]);
  const at = ordered.findIndex((p) => p.id === id || p.key === id || p.memberId === id);
  const p = ordered[at];

  if (!p) {
    const m = missing.find((x) => x.id === id);
    return (
      <div className="adm-panel adm-panel--form srv-empty">
        <a className="adm-link adm-small" href="#admin/survey/people">
          ← All people
        </a>
        <h2>
          <Txt>{m ? m.name : "Not found"}</Txt>
        </h2>
        <p className="adm-muted">
          {m
            ? "Hasn't answered the survey yet, or answered under a name that isn't linked to them. Check Import & data → Linking."
            : "There's no survey response for this link."}
        </p>
      </div>
    );
  }

  const prev = ordered[(at - 1 + ordered.length) % ordered.length];
  const next = ordered[(at + 1) % ordered.length];
  const ranked = [...people].filter((x) => x.score != null).sort((a, b) => b.score - a.score);
  const rank = ranked.indexOf(p) + 1;
  const when = (iso) => (iso === "unknown" ? "unknown date" : new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));

  return (
    <div className="srv-profile">
      <div className="srv-profile__nav">
        <a className="adm-link adm-small" href="#admin/survey/people">
          ← All people
        </a>
        <span className="srv-profile__step">
          <a className="adm-btn" href={personHref(prev)} aria-label="Previous person">
            ←
          </a>
          <span className="adm-muted adm-small">
            {at + 1} / {ordered.length}
          </span>
          <a className="adm-btn" href={personHref(next)} aria-label="Next person">
            →
          </a>
        </span>
      </div>

      <header className="adm-panel adm-panel--form srv-profile__head">
        <Avatar person={p} size={72} />
        <div className="srv-profile__who">
          <h2>
            <Txt>{displayName(p)}</Txt>
          </h2>
          {p.member && p.member.name !== p.name && (
            <p className="adm-muted adm-small">
              Answered as <Txt>{p.name}</Txt>
            </p>
          )}
          <p className="adm-muted adm-small">
            {[p.major, p.year && yearLabel(p.year)].filter(Boolean).join(" · ")} · answered {when(p.submittedAt)}
            {p.submissions > 1 && ` · submitted ${p.submissions} times (showing the latest)`}
          </p>
          <p className="srv-profile__links adm-small">
            {p.member ? (
              <a className="adm-link" href={`/#member/${p.member.id}`} target="_blank" rel="noopener">
                Public profile ↗
              </a>
            ) : (
              <a className="adm-link" href="#admin/survey/data">
                Not linked to a roster member: link them
              </a>
            )}
          </p>
        </div>
        <div className="srv-profile__score">
          <span className="srv-stat__label">Skill score</span>
          <span className="srv-stat__value">{p.score ?? "–"}</span>
          <TierTag tier={p.tier} />
          {rank > 0 && (
            <span className="adm-muted adm-small">
              #{rank} of {ranked.length} · track avg {Math.round(stats.averageScore)}
            </span>
          )}
        </div>
      </header>

      <div className="srv-grid">
        <Card title="Skills" wide note="Their answer, and where it sits on the 4-step scale. The marker under each bar is the track average.">
          <ul className="srv-skills">
            {SCALES.map((q) => {
              const l = p.levels[q.id];
              const avg = stats.scales.find((s) => s.id === q.id)?.average;
              return (
                <li key={q.id}>
                  <span className="srv-skills__label">{q.label}</span>
                  <span className="srv-skills__bar">
                    <span className="srv-skills__steps">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} style={{ background: l.level != null && i <= l.level ? LEVEL_COLORS[l.level] : undefined }} />
                      ))}
                    </span>
                    {avg != null && <span className="srv-skills__avg" style={{ left: `${((avg + 0.5) / 4) * 100}%` }} title={`Track average: ${(avg + 1).toFixed(1)} / 4`} />}
                  </span>
                  <span className="srv-skills__answer">
                    <strong>{l.level != null ? `${l.level + 1}/4 · ${l.label}` : "No answer"}</strong>
                    {l.raw && <Txt className="adm-muted adm-small">{l.raw}</Txt>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="How they like to work">
          <dl className="srv-facts">
            {SINGLES.map((q) => (
              <Fact key={q.id} label={q.label} answer={p.singles[q.id]} />
            ))}
            {p.color && (
              <div>
                <dt>Favorite color</dt>
                <dd>
                  <span className="srv-colors__swatch" style={{ background: p.color.hex ?? "transparent" }} /> {p.color.name}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card title="Picks">
          <dl className="srv-facts">
            {MULTIS.map((q) => (
              <div key={q.id}>
                <dt>{q.label}</dt>
                <dd>
                  {p.multis[q.id].length ? (
                    <span className="srv-tags">
                      {p.multis[q.id].map((a, i) => (
                        <Txt key={i} className="srv-tagpill">
                          {a.other ? `Other: ${a.other}` : a.label}
                        </Txt>
                      ))}
                    </span>
                  ) : (
                    <span className="adm-muted">–</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        {TEXTS.filter((q) => p.texts[q.id]).map((q) => (
          <Card key={q.id} title={q.label} wide>
            <Txt as="blockquote" className="srv-bigquote">
              {p.texts[q.id]}
            </Txt>
          </Card>
        ))}

        <Card title="Every answer, as submitted" wide>
          <details className="srv-raw">
            <summary>Show the raw row from the spreadsheet</summary>
            <table className="srv-table">
              <tbody>
                {Object.entries(p.answers).map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>
                      <Txt>{v}</Txt>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Card>
      </div>
    </div>
  );
}

function Fact({ label, answer }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {answer ? (
          <>
            {answer.other ? <Txt>{`Other: ${answer.other}`}</Txt> : answer.label}
            {!answer.other && answer.label !== answer.raw && <Txt className="adm-muted adm-small srv-facts__raw">{answer.raw}</Txt>}
          </>
        ) : (
          <span className="adm-muted">–</span>
        )}
      </dd>
    </div>
  );
}
