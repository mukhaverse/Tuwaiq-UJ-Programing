// Suggests balanced teams for group projects from the survey: a similar skill
// average per team and a spread of preferred roles. Nothing is saved; shuffle
// until it looks right, then copy it.
import { useMemo, useState } from "react";
import { useToast } from "../hooks";
import { Button } from "../ui";
import { buildTeams } from "./model";
import { Avatar, ScoreBar, TierTag, Txt } from "./charts";
import { displayName, personHref } from "./format";

export default function Teams({ people }) {
  const scored = useMemo(() => people.filter((p) => p.score != null), [people]);
  const [count, setCount] = useState(() => Math.max(2, Math.round(scored.length / 5)));
  const [seed, setSeed] = useState(1);
  const toast = useToast();
  const teams = useMemo(() => buildTeams(scored, count, seed), [scored, count, seed]);
  const spread = teams.length ? Math.max(...teams.map((t) => t.average)) - Math.min(...teams.map((t) => t.average)) : 0;

  const copy = () => {
    const text = teams.map((t) => `${t.name}\n${t.members.map((p) => `- ${displayName(p)} (${p.singles.role?.label ?? "?"})`).join("\n")}`).join("\n\n");
    navigator.clipboard.writeText(text).then(
      () => toast("Teams copied"),
      () => toast("Couldn't copy", "error")
    );
  };

  return (
    <div className="srv-teams">
      <div className="adm-panel srv-teams__controls">
        <label className="adm-field">
          <span className="adm-field__label">Number of teams</span>
          <input
            id="srv-team-count"
            type="number"
            min={2}
            max={Math.max(2, scored.length)}
            value={count}
            onChange={(e) => setCount(Math.min(Math.max(2, Number(e.target.value) || 2), Math.max(2, scored.length)))}
          />
        </label>
        <p className="adm-muted adm-small">
          {scored.length} people, about {Math.round(scored.length / count)} per team. Each team gets a similar mix of skill levels and preferred roles. Team
          averages differ by {Math.round(spread)} points.
        </p>
        <div className="adm-actions">
          <Button onClick={() => setSeed((s) => s + 1)}>Shuffle</Button>
          <Button variant="primary" onClick={copy}>
            Copy as text
          </Button>
        </div>
      </div>

      <div className="srv-teams__grid">
        {teams.map((t) => (
          <section key={t.name} className="srv-card srv-team">
            <header className="srv-card__head">
              <h3>{t.name}</h3>
              <p className="adm-muted adm-small">
                avg score {Math.round(t.average)} · {t.roles.map((r) => `${r.count} ${r.label}`).join(", ")}
              </p>
            </header>
            <ul className="srv-team__list">
              {t.members.map((p) => (
                <li key={p.key}>
                  <a href={personHref(p)}>
                    <Avatar person={p} size={26} />
                    <span className="srv-team__name">
                      <Txt>{displayName(p)}</Txt>
                      <span className="adm-muted adm-small">{p.singles.role?.label ?? "No role picked"}</span>
                    </span>
                    <ScoreBar score={p.score} />
                    <TierTag tier={p.tier} />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
