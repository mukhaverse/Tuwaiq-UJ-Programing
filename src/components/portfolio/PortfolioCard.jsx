// The portfolio task on the home page, right under the hero: one line for each kind of
// visitor. A member sees their task (status, progress, next deadline, one button); a
// leader sees what's waiting; a visitor sees a sign-in prompt only while member sign-up
// is open. Nobody else sees anything.
import { useEffect, useState } from "react";
import { STATUS_LABEL, deadlineTitle, isOverdue, nextDeadline, pendingDeadline, progressOf, timeLeft } from "../../data/portfolio";
import { api, usePortfolioSession } from "../../portfolio/session";
import "./PortfolioCard.css";

const ACTION = {
  not_started: "Start",
  awaiting_initial_review: "View",
  revisions_requested: "See feedback",
  awaiting_final_review: "View",
  final_correction_requested: "See feedback",
  completed: "View",
};

const TONE = {
  not_started: "idle",
  awaiting_initial_review: "wait",
  revisions_requested: "act",
  awaiting_final_review: "wait",
  final_correction_requested: "act",
  completed: "done",
};

export default function PortfolioCard() {
  const session = usePortfolioSession();
  if (session.loading) return null;
  if (session.kind === "member") return <MemberCard unread={session.unread} />;
  if (session.kind === "leader")
    return (
      <Shell eyebrow="Leaders" title="Portfolio reviews." href="#portfolio" action="Open">
        <p className="ptc__line">{session.unread ? `${session.unread} unread ${session.unread === 1 ? "update" : "updates"}` : "All caught up."}</p>
      </Shell>
    );
  if (session.kind === "unverified" && session.signupOpen)
    return (
      <Shell eyebrow="Build your portfolio" title="One step left." href="#portfolio" action="Confirm">
        <p className="ptc__line">Confirm your Tuwaiq Club email to open your task.</p>
      </Shell>
    );
  if (session.kind === "guest" && session.signupOpen)
    return (
      <Shell eyebrow="For members" title="Build your portfolio." href="#portfolio" action="Sign in">
        <p className="ptc__line">Submit it, get feedback from the leaders, track your progress.</p>
      </Shell>
    );
  return null;
}

function Shell({ eyebrow, title, href, action, children }) {
  return (
    <section className="ptc wrap" aria-label="Portfolio task">
      <a className="ptc__card" href={href}>
        <div className="ptc__text">
          <p className="ptc__eyebrow mono">{eyebrow}</p>
          <p className="ptc__title">{title}</p>
          {children}
        </div>
        <span className="ptc__go mono">
          {action} <span aria-hidden="true">→</span>
        </span>
      </a>
    </section>
  );
}

function MemberCard({ unread }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api("/portfolio/me")
      .then(setData)
      .catch(() => setData(false));
  }, [unread]);

  if (!data) return null;
  const { task, deadlines } = data;
  const { percent } = progressOf(task.status);
  const missed = isOverdue(task.status, deadlines) ? pendingDeadline(task.status, deadlines) : null;
  const next = nextDeadline(deadlines);

  return (
    <Shell eyebrow="Your task" title="Build your portfolio." href="#portfolio" action={ACTION[task.status]}>
      <div className="ptc__meta">
        <span className={`ptc__status ptc__status--${TONE[task.status]}`}>{STATUS_LABEL[task.status]}</span>
        {task.status !== "completed" &&
          (missed ? (
            <span className="ptc__late">{timeLeft(missed).text}</span>
          ) : next ? (
            <span>
              {deadlineTitle(next)} · {timeLeft(next.due).text}
            </span>
          ) : null)}
        {unread > 0 && <span className="ptc__unread">{unread} new</span>}
      </div>
      <span className="ptc__bar" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </span>
    </Shell>
  );
}
