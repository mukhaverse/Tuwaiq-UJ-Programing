// Overall stats: the big picture of the survey. Each question in detail lives
// in the Questions tab; takeaways and the question index link straight to it.
import { Button } from "../ui";
import { useToast } from "../hooks";
import { Card, Chapter, PeopleChips, ScaleStack, StatTile, TierTiles, Timeline, Txt } from "./charts";
import { QUESTION_GROUPS, timeline } from "./model";
import { pct, questionHref } from "./format";

const CHAPTERS = [
  { id: "summary", label: "Summary" },
  { id: "skills", label: "Skills" },
  { id: "involve", label: "Who to involve" },
  { id: "responses", label: "Responses" },
  { id: "index", label: "All questions" },
];

const date = (iso) => (iso && iso !== "unknown" ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "–");
const lower = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const top = (items) => items.find((i) => i.count && i.label !== "Other") ?? null;

export default function Overview({ stats: s, people, missing, members, questions }) {
  const submissions = people.reduce((n, p) => n + p.submissions, 0);
  const unlinked = people.filter((p) => !p.memberId);
  const latest = people.reduce((a, p) => (p.submittedAt > a ? p.submittedAt : a), "");
  const confident = s.tiers.find((t) => t.id === "advanced");
  const takeaways = buildTakeaways(s);

  return (
    <div className="srv-overview">
      <JumpNav />

      <Chapter id="summary" title="Summary">
        <div className="srv-kpis srv-card--wide">
          <StatTile label="Answered" value={`${s.n}/${members.length}`} note={missing.length ? `${missing.length} on the roster haven't answered` : "everyone on the roster"} />
          <StatTile label="Average skill score" value={s.averageScore == null ? "–" : Math.round(s.averageScore)} note="out of 100" />
          <StatTile label="Questions" value={questions.length} note="each one in the Questions tab" />
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

        <Card title="Key takeaways" note="Click one to open that question." wide>
          <ol className="srv-takeaways">
            {takeaways.map((t) => (
              <li key={t.text}>
                <a href={t.href}>
                  <span className="srv-takeaways__value">{t.value}</span>
                  <span>{t.text}</span>
                  <span className="srv-takeaways__go" aria-hidden="true">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ol>
          <CopySummary stats={s} takeaways={takeaways} />
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

      <Chapter id="responses" title="Responses">
        <Card eyebrow="When people answered" title={responseTitle(people)} note="By the day each person first submitted. Hover a day for names." wide>
          <Timeline days={timeline(people)} total={members.length} />
        </Card>
      </Chapter>

      <Chapter id="index" title="All questions" lead="The top answer to every question. Click one for its full stats, who gave each answer, and a breakdown.">
        {QUESTION_GROUPS.map((group) => {
          const inGroup = questions.filter((q) => q.group === group);
          if (!inGroup.length) return null;
          return (
            <section key={group} className="srv-index srv-card--wide" aria-label={group}>
              <h3 className="srv-index__title">{group}</h3>
              <ul className="srv-index__grid">
                {inGroup.map((q) => (
                  <li key={q.id}>
                    <QuestionTile q={q} n={questions.indexOf(q) + 1} total={s.n} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </Chapter>
    </div>
  );
}

/** One question in the index: its top answer and how big a share gave it. */
function QuestionTile({ q, n, total }) {
  const best = q.kind === "text" ? null : [...q.items].sort((a, b) => b.count - a.count).find((i) => i.count && i.label !== "Other");
  return (
    <a className="srv-qtile" href={questionHref(q.id)}>
      <span className="srv-qtile__n">{n}</span>
      <span className="srv-qtile__label">{q.label}</span>
      {best ? (
        <>
          <span className="srv-qtile__answer">
            <Txt>{best.label}</Txt>
          </span>
          <span className="srv-qtile__meter">
            <span style={{ width: `${pct(best.count, total)}%` }} />
          </span>
          <span className="adm-muted adm-small">
            {pct(best.count, total)}% · {q.kind === "multi" ? "picked most" : "most common"}
          </span>
        </>
      ) : (
        <span className="adm-muted adm-small">
          {q.answered} written {q.answered === 1 ? "answer" : "answers"}
        </span>
      )}
    </a>
  );
}

function buildTakeaways(s) {
  const share = (item) => `${pct(item.count, s.n)}%`;
  const interest = top(s.multis.interests.items);
  const want = top(s.multis.activities.items);
  const avoid = top(s.multis.avoid.items);
  const slot = s.availability[0];
  const blocker = top(s.singles.blocker.items);
  const format = top(s.singles.format.items);
  return [
    interest && { text: `${interest.label} is the top interest`, value: share(interest), href: questionHref("interests") },
    want && { text: `Most wanted: ${lower(want.label)}`, value: share(want), href: questionHref("activities") },
    avoid && { text: `Biggest turn-off: ${lower(avoid.label)}`, value: share(avoid), href: questionHref("avoid") },
    slot && { text: `${slot.label} work for the most people`, value: `${slot.count}/${s.n}`, href: questionHref("times") },
    format && { text: `Online or in person: "${format.label}" is the most common answer`, value: share(format), href: questionHref("format") },
    blocker && { text: `Main risk: ${lower(blocker.label)}. Plan lighter weeks around exams`, value: share(blocker), href: questionHref("blocker") },
    s.insights.noGit.length > 0 && { text: "Don't use Git yet: worth a hands-on session early", value: s.insights.noGit.length, href: questionHref("git") },
    s.insights.teachers.length > 0 && { text: "Would like to give a session themselves", value: s.insights.teachers.length, href: questionHref("helping") },
  ].filter(Boolean);
}

/** Copies the takeaways as plain text, to share with the co-leader or the club. */
function CopySummary({ stats: s, takeaways }) {
  const toast = useToast();
  const copy = () => {
    const text = [
      `Programming Track survey: ${s.n} responses, average skill score ${Math.round(s.averageScore ?? 0)}/100`,
      ...s.tiers.map((t) => `- ${t.label}: ${t.count}`),
      "",
      ...takeaways.map((t) => `- ${t.value}: ${t.text}`),
    ].join("\n");
    navigator.clipboard.writeText(text).then(
      () => toast("Summary copied"),
      () => toast("Couldn't copy", "error")
    );
  };
  return (
    <div className="adm-actions">
      <Button onClick={copy}>Copy summary as text</Button>
    </div>
  );
}

function responseTitle(people) {
  const days = timeline(people);
  if (!days.length) return "Responses";
  const first = days[0];
  return `${pct(first.count, people.length)}% answered on the first day`;
}

function jump(id) {
  document.getElementById(`srv-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Section links. Buttons, not #anchors: the admin panel's own routing lives in the URL hash. */
function JumpNav() {
  return (
    <nav className="srv-jump" aria-label="Overall sections">
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
