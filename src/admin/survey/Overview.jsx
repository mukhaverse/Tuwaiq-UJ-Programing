// The whole track at a glance, in chapters: a summary, skills, who to involve,
// what people want, planning sessions, who they are, and their own words. Each
// card's title is what the answers show; the question it comes from sits above it.
import { useState } from "react";
import { BarList, BigStat, Card, Chapter, ChipCloud, ColorStrip, Columns, PeopleChips, ScaleStack, SlotTiles, SplitBar, StatTile, TierTiles, Txt } from "./charts";
import { SPLIT_COLORS, displayName, pct, personHref } from "./format";

const CHAPTERS = [
  { id: "summary", label: "Summary" },
  { id: "skills", label: "Skills" },
  { id: "involve", label: "Who to involve" },
  { id: "wants", label: "What they want" },
  { id: "planning", label: "Planning sessions" },
  { id: "who", label: "Who they are" },
  { id: "words", label: "In their words" },
];

const date = (iso) => (iso && iso !== "unknown" ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "–");
const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const top = (items) => items.find((i) => i.count && i.label !== "Other") ?? null;

export default function Overview({ stats: s, people, missing, members }) {
  const submissions = people.reduce((n, p) => n + p.submissions, 0);
  const unlinked = people.filter((p) => !p.memberId);
  const latest = people.reduce((a, p) => (p.submittedAt > a ? p.submittedAt : a), "");
  const share = (item) => `${pct(item.count, s.n)}%`;

  const interest = top(s.multis.interests.items);
  const want = top(s.multis.activities.items);
  const avoid = top(s.multis.avoid.items);
  const [tech1, tech2] = s.multis.tech.items.filter((i) => i.label !== "Other");
  const role = top(s.singles.role.items);
  const slot = s.availability[0];
  const format = top(s.singles.format.items);
  const blocker = top(s.singles.blocker.items);
  const learning = top(s.singles.learning.items);
  const major = top(s.majors);
  const year = [...s.years].sort((a, b) => b.count - a.count)[0];
  const color = s.colors[0];
  const confident = s.tiers.find((t) => t.id === "advanced");

  return (
    <div className="srv-overview">
      <JumpNav />

      <Chapter id="summary" title="Summary">
        <div className="srv-kpis srv-card--wide">
          <StatTile label="Answered" value={`${s.n}/${members.length}`} note={missing.length ? `${missing.length} on the roster haven't answered` : "everyone on the roster"} />
          <StatTile label="Average skill score" value={s.averageScore == null ? "–" : Math.round(s.averageScore)} note="out of 100" />
          <StatTile label="Repeat submissions ignored" value={submissions - s.n} note="only each person's latest counts" />
          <StatTile label="Latest response" value={date(latest)} />
        </div>

        {(unlinked.length > 0 || missing.length > 0) && (
          <Card title="Needs a look" wide className="srv-card--alert">
            {unlinked.length > 0 && (
              <p>
                <strong>{unlinked.length}</strong> {unlinked.length === 1 ? "response isn't" : "responses aren't"} linked to a roster member.{" "}
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

        <Card title="Key takeaways" wide>
          <ol className="srv-takeaways">
            {[
              interest && { text: `${interest.label} is the top interest`, value: share(interest), to: "wants" },
              want && { text: `Most wanted: ${lower(want.label)}`, value: share(want), to: "wants" },
              avoid && { text: `Biggest turn-off: ${lower(avoid.label)}`, value: share(avoid), to: "wants" },
              slot && { text: `${slot.label} work for the most people`, value: `${slot.count}/${s.n}`, to: "planning" },
              blocker && { text: `Main risk: ${lower(blocker.label)}. Plan lighter weeks around exams`, value: share(blocker), to: "planning" },
              s.insights.noGit.length > 0 && { text: "Don't use Git yet: worth a hands-on session early", value: s.insights.noGit.length, to: "involve" },
              s.insights.teachers.length > 0 && { text: "Would like to give a session themselves", value: s.insights.teachers.length, to: "involve" },
            ]
              .filter(Boolean)
              .map((t) => (
                <li key={t.text}>
                  <button type="button" onClick={() => jump(t.to)}>
                    <span className="srv-takeaways__value">{t.value}</span>
                    <span>{t.text}</span>
                    <span className="srv-takeaways__go" aria-hidden="true">
                      ↓
                    </span>
                  </button>
                </li>
              ))}
          </ol>
        </Card>
      </Chapter>

      <Chapter id="skills" title="Skills" lead="How experienced the track is, from the 5 skill questions. Each has 4 answers, from least to most experienced.">
        <Card
          eyebrow="Overall level"
          title={confident ? `${confident.count} of ${s.n} are already confident` : "Overall level"}
          note="From each person's average skill answer: under 34 starting out, 34–66 building up, 67 and up confident. Click a group for names."
          wide
        >
          <TierTiles tiers={s.tiers} total={s.n} />
        </Card>
        <Card eyebrow="Skill questions" title={strongestWeakest(s.scales)} note="Click a skill for each answer and who gave it." wide>
          <ScaleStack scales={s.scales} />
        </Card>
      </Chapter>

      <Chapter id="involve" title="Who to involve" lead="Lists worked out from the answers, for mentoring, workshops and team leads. Click a name for their profile.">
        <div className="srv-insights srv-card--wide">
          <Insight tone="good" title="Could mentor others" note="Like to teach, and rate confident" people={s.insights.mentors} />
          <Insight tone="good" title="Want to give a session" note="Would love to explain or present" people={s.insights.teachers} />
          <Insight tone="good" title="Want to lead or organize" note="Picked leading, or already organize teams" people={s.insights.leaders} />
          <Insight tone="care" title="May need extra support" note="Starting out, can't build alone yet, or find content too hard" people={s.insights.support} />
          <Insight tone="care" title="Don't use Git yet" note="A Git & GitHub workshop would help" people={s.insights.noGit} />
          <Insight tone="care" title="No project outside class yet" note="Good fits for a guided first project" people={s.insights.noProjects} />
          <Insight tone="care" title="Never worked in a team" note="Pair them with someone experienced" people={s.insights.noTeam} />
        </div>
      </Chapter>

      <Chapter id="wants" title="What they want" lead="Pick-several questions: percentages are of people, so they add up to more than 100%.">
        <Card eyebrow="Interests" title={interest ? `${interest.label} leads, at ${share(interest)}` : "Interests"} note="Click a bar for who.">
          <BarList items={s.multis.interests.items} total={s.n} />
        </Card>
        <Card eyebrow="Preferred team role" title={role ? `Most want ${role.label === "Leading / organizing" ? "to lead" : role.label}: ${share(role)}` : "Preferred team role"} note="One answer each. Click a row for who.">
          <SplitBar items={s.singles.role.items} total={s.n} />
        </Card>
        <Card
          eyebrow="Activities they want, and what would put them off"
          title={want && avoid ? `Yes to ${lower(want.label)}, no to ${lower(avoid.label)}` : "Activities"}
          wide
        >
          <div className="srv-dodont">
            <div>
              <p className="srv-dodont__head">
                <span className="srv-legend__key" style={{ background: SPLIT_COLORS[1] }} />
                Want
              </p>
              <BarList items={s.multis.activities.items} total={s.n} colors={s.multis.activities.items.map(() => SPLIT_COLORS[1])} />
            </div>
            <div>
              <p className="srv-dodont__head">
                <span className="srv-legend__key" style={{ background: SPLIT_COLORS[2] }} />
                Would put them off
              </p>
              <BarList items={s.multis.avoid.items} total={s.n} colors={s.multis.avoid.items.map(() => SPLIT_COLORS[2])} />
            </div>
          </div>
        </Card>
        <Card
          eyebrow="Technologies used"
          title={tech1 && tech2 ? `${tech1.label} and ${tech2.label} are the most used` : "Technologies used"}
          note="Darker pills are more common. Click one for who uses it."
          wide
        >
          <ChipCloud items={s.multis.tech.items} total={s.n} />
        </Card>
      </Chapter>

      <Chapter id="planning" title="Planning sessions" lead="When, how and what could get in the way.">
        <Card eyebrow="Preferred times" title={slot ? `${slot.label} work for ${slot.count} of ${s.n}` : "Preferred times"} note={`Counts the times each person picked, plus the ${s.anyTime} who said any time works.`} wide>
          <SlotTiles items={s.availability} total={s.n} />
        </Card>
        <Card eyebrow="Online or in person" title={format ? `"${format.label}" is the most common answer` : "Activity format"}>
          <SplitBar items={s.singles.format.items} total={s.n} />
        </Card>
        <Card eyebrow="What could get in the way" title={blocker ? `${blocker.label} is the main risk` : "Blockers"}>
          <SplitBar items={s.singles.blocker.items} total={s.n} />
        </Card>
        <Card eyebrow="Helping others" title={`${s.insights.teachers.length} would happily teach a session`}>
          <SplitBar items={s.singles.helping.items} total={s.n} />
        </Card>
        <Card eyebrow="Learning preference" title="Learn new things, or go deeper?">
          {learning ? (
            <BigStat
              value={share(learning)}
              label={`chose "${learning.label}"`}
              note={s.singles.learning.items
                .filter((i) => i !== learning && i.count)
                .map((i) => `${i.label}: ${i.count}`)
                .join(" · ")}
            />
          ) : (
            <p className="adm-muted adm-small">No answers yet.</p>
          )}
        </Card>
      </Chapter>

      <Chapter id="who" title="Who they are">
        <Card eyebrow="Major" title={major ? `Mostly ${major.label}` : "Major"}>
          {major && (
            <BigStat
              value={share(major)}
              label={`study ${major.label}`}
              note={s.majors
                .filter((m) => m !== major)
                .map((m) => `${m.label} ${m.count}`)
                .join(" · ")}
            />
          )}
        </Card>
        <Card eyebrow="Academic year" title={year ? `${year.label} is the biggest group` : "Academic year"} note="Click a column for names.">
          <Columns items={s.years} total={s.n} />
        </Card>
        <Card eyebrow="Favorite colors" title={color ? `${color.label} is the favorite` : "Favorite colors"} note="Handy for merch and team colors." wide>
          <ColorStrip items={s.colors} />
        </Card>
      </Chapter>

      <Chapter id="words" title="In their words">
        <Card eyebrow={s.texts.success.label} title="What success looks like to them" wide>
          <Quotes entries={s.texts.success.entries} limit={6} />
        </Card>
        <Card eyebrow={s.texts.note.label} title="Notes to you" wide>
          <Quotes entries={s.texts.note.entries} limit={6} empty="No notes." />
        </Card>
        <Card eyebrow={`Answers typed under "Other"`} title="Written-in answers" wide>
          <Quotes
            entries={[
              ...s.singles.blocker.others.map((o) => ({ ...o, tag: "What could get in the way" })),
              ...Object.values(s.multis).flatMap((q) => q.others.map((o) => ({ ...o, tag: q.label }))),
              ...s.texts.learningDetails.entries.map((o) => ({ ...o, tag: s.texts.learningDetails.label })),
            ]}
            limit={6}
            empty="No written-in answers."
          />
        </Card>
      </Chapter>
    </div>
  );
}

function jump(id) {
  document.getElementById(`srv-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Section links. Buttons, not #anchors: the admin panel's own routing lives in the URL hash. */
function JumpNav() {
  return (
    <nav className="srv-jump" aria-label="Overview sections">
      {CHAPTERS.map((c) => (
        <button key={c.id} type="button" onClick={() => jump(c.id)}>
          {c.label}
        </button>
      ))}
    </nav>
  );
}

function strongestWeakest(scales) {
  const ranked = scales.filter((q) => q.average != null).sort((a, b) => b.average - a.average);
  if (ranked.length < 2) return "Skill levels";
  return `Strongest: ${ranked[0].label}. Weakest: ${ranked.at(-1).label}`;
}

function Insight({ title, note, people, tone }) {
  return (
    <div className={`srv-insight srv-insight--${tone}`}>
      <p className="srv-insight__count">{people.length}</p>
      <p className="srv-insight__title">{title}</p>
      <p className="adm-muted adm-small">{note}</p>
      <PeopleChips people={people} limit={4} />
    </div>
  );
}

function Quotes({ entries, empty = "Nothing yet.", limit }) {
  const [all, setAll] = useState(false);
  if (!entries.length) return <p className="adm-muted adm-small">{empty}</p>;
  const shown = limit && !all ? entries.slice(0, limit) : entries;
  return (
    <>
      <ul className="srv-quotes">
        {shown.map((e, i) => (
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
      {limit && entries.length > limit && (
        <button type="button" className="srv-more" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${entries.length}`}
        </button>
      )}
    </>
  );
}
