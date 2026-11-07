// The portfolio task's pages (#portfolio…), loaded only when opened. What shows depends
// on who's signed in; the API checks the same thing on every request.
//
//   #portfolio                member: their task · leader: the dashboard · else sign in / verify
//   #portfolio/m/<id>         leader: one member's review page
//   #portfolio/access         leader: roster and sign-ups
//   #portfolio/deadlines      leader: the two deadlines
import { useEffect } from "react";
import { Blocked, NotFound, SignIn, Verify } from "./Access";
import MemberTask from "./MemberTask";
import Dashboard from "./leader/Dashboard";
import Deadlines from "./leader/Deadlines";
import Members from "./leader/Members";
import Review from "./leader/Review";
import { Notifications, PageState } from "./parts";
import { refreshSession, signOut, usePortfolioSession } from "./session";
import "./portfolio.css";

export default function PortfolioApp({ path }) {
  const session = usePortfolioSession();
  const [section, id] = path.split("/");

  // Keep the unread count fresh while the page is open.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && refreshSession(), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [path]);

  let page;
  if (session.loading) page = <PageState />;
  else if (session.kind === "guest") page = <SignIn signupOpen={session.signupOpen} />;
  else if (session.kind === "unverified")
    page = session.emailCodes ? <Verify name={session.name} signupOpen={session.signupOpen} /> : <NotFound name={session.name} />;
  else if (session.kind === "blocked") page = <Blocked name={session.name} />;
  else if (session.kind === "member") page = <MemberTask />;
  else if (section === "m" && /^\d+$/.test(id ?? "")) page = <Review key={id} id={id} />;
  else if (section === "access") page = <Members />;
  else if (section === "deadlines") page = <Deadlines />;
  else page = <Dashboard />;

  const leader = session.kind === "leader";
  const signedIn = !session.loading && session.kind !== "guest";
  return (
    <div className="pf-app">
      <header className="pf-top">
        <a href="#top" className="pf-top__back">
          ← Site
        </a>
        {leader && (
          <nav className="pf-top__nav" aria-label="Leader pages">
            <a href="#portfolio" aria-current={!section || section === "m" ? "page" : undefined}>
              Members
            </a>
            <a href="#portfolio/access" aria-current={section === "access" ? "page" : undefined}>
              Roster
            </a>
            <a href="#portfolio/deadlines" aria-current={section === "deadlines" ? "page" : undefined}>
              Deadlines
            </a>
          </nav>
        )}
        <div className="pf-top__me">
          {(leader || session.kind === "member") && (
            <Notifications unread={session.unread} onChange={refreshSession} hrefFor={(n) => (leader ? `#portfolio/m/${n.rosterId}` : "#portfolio")} />
          )}
          {signedIn && (
            <>
              {session.image && <img src={session.image} alt="" width="26" height="26" className="pf-avatar" />}
              <button type="button" className="pf-top__signout" onClick={() => signOut()}>
                Sign out
              </button>
            </>
          )}
        </div>
      </header>
      <main className="pf-main">{page}</main>
    </div>
  );
}
