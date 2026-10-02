// The whole track at a glance: who answered, skill levels, what people want,
// who might mentor or need support, and what they wrote in their own words.
import { BarList, Card, PeopleChips, ScaleStack, StatTile, Txt } from "./charts";
import { LEVEL_COLORS, displayName, pct, personHref } from "./format";

const date = (iso) => (iso && iso !== "unknown" ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "–");

export default function Overview({ stats: s, people, missing, members }) {
  const submissions = people.reduce((n, p) => n + p.submissions, 0);
  const unlinked = people.filter((p) => !p.memberId);
  const latest = people.reduce((a, p) => (p.submittedAt > a ? p.submittedAt : a), "");

  return (
    <div className="srv-grid">
      <div className="srv-kpis srv-card--wide">
        <StatTile label="People who answered" value={s.n} note={`of ${members.length} on the roster`} />
        <StatTile label="Response rate" value={`${pct(people.filter((p) => p.memberId).length, members.length)}%`} note={`${missing.length} haven't answered`} />
        <StatTile label="Average skill score" value={s.averageScore == null ? "–" : Math.round(s.averageScore)} note="out of 100, from the 5 skill questions" />
        <StatTile label="Repeat submissions" value={submissions - s.n} note="ignored: only each person's latest counts" />
        <StatTile label="Latest response" value={date(latest)} />
      </div>

      {(unlinked.length > 0 || missing.length > 0) && (
        <Card title="Needs a look" wide className="srv-card--alert">
          {unlinked.length > 0 && (
            <p>
              <strong>{unlinked.length}</strong> {unlinked.length === 1 ? "response isn't" : "responses aren't"} linked to a roster member, so{" "}
              {unlinked.length === 1 ? "it doesn't" : "they don't"} count toward the response rate.{" "}
              <a className="adm-link" href="#admin/survey/data">
                Link them →
              </a>
            </p>
          )}
          {missing.length > 0 && (
            <>
              <p>Haven't answered yet:</p>
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
        </Card>
      )}

      <Card title="Headlines" wide>
        <ul className="srv-headlines">
          {headlines(s).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </Card>

      <Card title="Skill levels" note="Each skill question has 4 answers, from least to most experienced. Click a skill for the answers and who gave them." wide>
        <ScaleStack scales={s.scales} />
      </Card>

      <Card title="Overall level" note="From the average of the 5 skill answers: under 34 starting out, 34–66 building up, 67+ confident.">
        <BarList items={s.tiers} total={s.n} colors={[LEVEL_COLORS[0], LEVEL_COLORS[2], LEVEL_COLORS[3]]} />
      </Card>

      <Card title="Ranked by skill score" note="Highest first. Click a name for their profile.">
        <ol className="srv-rank">
          {[...people]
            .filter((p) => p.score != null)
            .sort((a, b) => b.score - a.score)
            .map((p) => (
              <li key={p.key}>
                <a href={personHref(p)}>
                  <Txt>{displayName(p)}</Txt>
                </a>
                <span className="srv-rank__score">{p.score}</span>
              </li>
            ))}
        </ol>
      </Card>

      <Card title="Who to involve" wide note="Lists worked out from the answers, to plan mentoring, workshops and team leads.">
        <div className="srv-insights">
          <Insight title="Could mentor others" note="Like to teach and rate confident" people={s.insights.mentors} />
          <Insight title="Want to give a session" note="Said they'd love to explain or present" people={s.insights.teachers} />
          <Insight title="May need extra support" note="Starting out, can't build alone yet, or find content too hard" people={s.insights.support} />
          <Insight title="Want to lead or organize" note="Chose leading as their role, or already organize teams" people={s.insights.leaders} />
          <Insight title="Don't use Git yet" note="A Git & GitHub workshop would help these" people={s.insights.noGit} />
          <Insight title="No project outside class yet" note="Good fits for a guided first project" people={s.insights.noProjects} />
          <Insight title="Never worked in a team" note="Pair them with someone experienced" people={s.insights.noTeam} />
        </div>
      </Card>

      <Card title={s.multis.interests.label} note="Pick-several: percentages are of people, so they add up to more than 100%.">
        <BarList items={s.multis.interests.items} total={s.n} />
      </Card>
      <Card title={s.multis.activities.label} note="Pick-several.">
        <BarList items={s.multis.activities.items} total={s.n} />
      </Card>
      <Card title={s.multis.avoid.label} note="Pick-several.">
        <BarList items={s.multis.avoid.items} total={s.n} />
      </Card>
      <Card title={s.multis.tech.label} note="Pick-several.">
        <BarList items={s.multis.tech.items} total={s.n} limit={8} />
      </Card>
      <Card title={s.singles.role.label}>
        <BarList items={s.singles.role.items} total={s.n} />
      </Card>
      <Card title="Best time to meet" note={`Who can make each time: the ones they picked, plus the ${s.anyTime} who said any time works.`}>
        <BarList items={s.availability} total={s.n} />
      </Card>
      <Card title={s.singles.format.label}>
        <BarList items={s.singles.format.items} total={s.n} />
      </Card>
      <Card title={s.singles.blocker.label}>
        <BarList items={s.singles.blocker.items} total={s.n} />
      </Card>
      <Card title={s.singles.helping.label}>
        <BarList items={s.singles.helping.items} total={s.n} />
      </Card>
      <Card title={s.singles.learning.label}>
        <BarList items={s.singles.learning.items} total={s.n} />
      </Card>
      <Card title="Major" note="Spellings in Arabic and English grouped together.">
        <BarList items={s.majors} total={s.n} />
      </Card>
      <Card title="Academic year">
        <BarList items={s.years} total={s.n} />
      </Card>
      <Card title="Favorite colors" note="Handy for merch, team colors and their characters.">
        <ul className="srv-colors">
          {s.colors.map((c) => (
            <li key={c.label} title={c.people.map(displayName).join(", ")}>
              <span className="srv-colors__swatch" style={{ background: c.hex ?? "transparent" }} />
              <span>{c.label}</span>
              <span className="adm-muted">{c.count}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Written-in answers" note={`Answers people typed under "Other".`}>
        <Quotes
          entries={[
            ...s.singles.blocker.others.map((o) => ({ ...o, tag: "What could get in the way" })),
            ...Object.values(s.multis).flatMap((q) => q.others.map((o) => ({ ...o, tag: q.label }))),
          ]}
          empty="No written-in answers."
        />
      </Card>

      <Card title={s.texts.success.label} note="In their own words." wide>
        <Quotes entries={s.texts.success.entries} />
      </Card>
      <Card title={s.texts.note.label} wide>
        <Quotes entries={s.texts.note.entries} empty="No notes." />
      </Card>
      {s.texts.learningDetails.entries.length > 0 && (
        <Card title={s.texts.learningDetails.label} wide>
          <Quotes entries={s.texts.learningDetails.entries} />
        </Card>
      )}
    </div>
  );
}

function Insight({ title, note, people }) {
  return (
    <div className="srv-insight">
      <p className="srv-insight__title">
        {title} <span className="srv-insight__count">{people.length}</span>
      </p>
      <p className="adm-muted adm-small">{note}</p>
      <PeopleChips people={people} />
    </div>
  );
}

function Quotes({ entries, empty = "Nothing yet." }) {
  if (!entries.length) return <p className="adm-muted adm-small">{empty}</p>;
  return (
    <ul className="srv-quotes">
      {entries.map((e, i) => (
        <li key={`${e.person.key}-${i}`}>
          <Txt as="blockquote">{e.text}</Txt>
          <p className="adm-small">
            <a className="adm-link" href={personHref(e.person)}>
              <Txt>{displayName(e.person)}</Txt>
            </a>
            {e.tag && <span className="adm-muted"> · {e.tag}</span>}
          </p>
        </li>
      ))}
    </ul>
  );
}

/** A few plain sentences from the numbers, for planning. */
function headlines(s) {
  const out = [];
  const top = (items) => items.find((i) => i.label !== "Other");
  const share = (item) => `${pct(item.count, s.n)}%`;
  const interest = top(s.multis.interests.items);
  if (interest) out.push(`${interest.label} is the top interest (${share(interest)} of people).`);
  const activity = top(s.multis.activities.items);
  if (activity) out.push(`Most wanted activity: ${activity.label.toLowerCase()} (${share(activity)}).`);
  const avoid = top(s.multis.avoid.items);
  if (avoid) out.push(`Biggest turn-off: ${avoid.label.toLowerCase()} (${share(avoid)}).`);
  const slot = s.availability[0];
  if (slot) out.push(`Best time to meet: ${slot.label.toLowerCase()}, which ${slot.count} of ${s.n} can make.`);
  const format = s.singles.format.items[0];
  if (format) out.push(`Online or in person: "${format.label}" is the most common answer (${share(format)}).`);
  const blocker = s.singles.blocker.items[0];
  if (blocker) out.push(`Main risk to attendance: ${blocker.label.toLowerCase()} (${share(blocker)}). Plan lighter weeks around exams.`);
  if (s.insights.noGit.length) out.push(`${s.insights.noGit.length} don't use Git yet, worth a hands-on Git session early on.`);
  if (s.insights.teachers.length) out.push(`${s.insights.teachers.length} would like to explain or give a session themselves.`);
  return out;
}
