// The members survey: stats for the whole track, one profile per person, a team
// builder, and importing the survey's spreadsheet. Admin only: the answers come
// from /api/admin/survey and are never part of the public site.
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useToast } from "../hooks";
import { analyze, buildPeople, buildQuestions } from "../survey/model";
import Overview from "../survey/Overview";
import Questions from "../survey/Questions";
import { PeopleList, Profile } from "../survey/People";
import Teams from "../survey/Teams";
import DataPanel from "../survey/Data";
import "../survey/survey.css";

const VIEWS = [
  { id: "", label: "Overall" },
  { id: "questions", label: "Questions" },
  { id: "people", label: "People" },
  { id: "teams", label: "Teams" },
  { id: "data", label: "Import & data" },
];

export default function SurveySection({ data, path = "" }) {
  const [responses, setResponses] = useState(null);
  const toast = useToast();

  const load = useCallback(
    () =>
      api("/admin/survey")
        .then((d) => setResponses(d.responses))
        .catch((e) => toast(e.message, "error")),
    [toast]
  );
  useEffect(() => {
    load();
  }, [load]);

  const { people, missing } = useMemo(() => buildPeople(responses ?? [], data.members), [responses, data.members]);
  const stats = useMemo(() => analyze(people), [people]);
  const questions = useMemo(() => buildQuestions(people), [people]);

  const [view, ...rest] = path.split("/");
  const personId = view === "people" && rest.length ? decodeURIComponent(rest.join("/")) : null;
  const questionId = view === "questions" ? rest[0] ?? null : null;
  const current = VIEWS.find((v) => v.id === view) ?? VIEWS[0];

  let body;
  if (!responses) body = <p className="adm-muted">Loading…</p>;
  else if (!responses.length && current.id !== "data")
    body = (
      <div className="adm-panel adm-panel--form srv-empty">
        <h2>No survey responses yet</h2>
        <p className="adm-muted">Import the survey's spreadsheet export (.xlsx or .csv) to see the stats and each member's profile.</p>
        <a className="adm-btn adm-btn--primary" href="#admin/survey/data">
          Import responses
        </a>
      </div>
    );
  else if (personId) body = <Profile id={personId} people={people} missing={missing} stats={stats} />;
  else if (current.id === "questions") body = <Questions questions={questions} people={people} stats={stats} id={questionId} />;
  else if (current.id === "people") body = <PeopleList people={people} missing={missing} />;
  else if (current.id === "teams") body = <Teams people={people} />;
  else if (current.id === "data") body = <DataPanel responses={responses} people={people} members={data.members} reload={load} />;
  else body = <Overview stats={stats} people={people} missing={missing} members={data.members} questions={questions} />;

  return (
    <div className="srv">
      <div className="srv-top">
        <nav className="srv-tabs" aria-label="Survey views">
          {VIEWS.map((v) => (
            <a key={v.id} href={`#admin/survey${v.id ? `/${v.id}` : ""}`} className="srv-tab" aria-current={v.id === current.id ? "page" : undefined}>
              {v.label}
            </a>
          ))}
        </nav>
        <p className="srv-private adm-small">
          <span aria-hidden="true">🔒</span> Only admins can see this. Members never see survey answers or stats.
        </p>
      </div>
      {body}
    </div>
  );
}
