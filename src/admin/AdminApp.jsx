// The admin panel (#admin). Loaded only when opened, so visitors never download it.
import { useCallback, useEffect, useState } from "react";
import { api, signInWithGitHub, signOut } from "./api";
import { Button, ToastProvider } from "./ui";
import { useSiteData } from "./hooks";
import MembersSection from "./sections/Members";
import JourneySection from "./sections/Journey";
import BadgesSection from "./sections/Badges";
import AnnouncementSection from "./sections/Announcement";
import SiteTextSection from "./sections/SiteText";
import FilesSection from "./sections/Files";
import "./admin.css";

// A new section is one entry here plus its file in sections/.
const SECTIONS = [
  { id: "members", label: "Members", Component: MembersSection },
  { id: "journey", label: "Journey", Component: JourneySection },
  { id: "badges", label: "Badges", Component: BadgesSection },
  { id: "announcement", label: "Up next tile", Component: AnnouncementSection },
  { id: "site", label: "Site text", Component: SiteTextSection },
  { id: "files", label: "Files", Component: FilesSection },
];

export default function AdminApp({ section }) {
  const [me, setMe] = useState(undefined); // undefined = loading, null = signed out
  const [error, setError] = useState(null);

  const loadMe = useCallback(
    () =>
      api("/me")
        .then((d) => setMe(d.user))
        .catch((e) => setError(e.message)),
    []
  );
  useEffect(() => {
    document.title = "Admin · Programming Track";
    loadMe();
  }, [loadMe]);

  let body;
  if (error) body = <Gate title="Couldn't reach the server">{error}</Gate>;
  else if (me === undefined) body = <Gate title="Loading…" />;
  else if (!me) body = <SignIn onSignedIn={loadMe} />;
  else if (me.role !== "admin")
    body = (
      <Gate title="No admin access">
        You're signed in as <strong>{me.email}</strong>, which doesn't have access to the admin panel. Ask the track
        leader to give you access.
        <SignOutButton onDone={loadMe} />
      </Gate>
    );
  else body = <Shell me={me} section={section} onSignedOut={loadMe} />;

  return <ToastProvider>{body}</ToastProvider>;
}

function Gate({ title, children }) {
  return (
    <main className="adm-gate">
      <div className="adm-gate__card">
        <p className="adm-eyebrow mono">PT admin</p>
        <h1>{title}</h1>
        {children && <div className="adm-gate__body">{children}</div>}
        <a className="adm-link" href="/">
          ← Back to the site
        </a>
      </div>
    </main>
  );
}

function SignIn({ onSignedIn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const go = async () => {
    setBusy(true);
    try {
      await signInWithGitHub();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <Gate title="Sign in">
      <p>Sign in with the GitHub account that has admin access.</p>
      <Button variant="primary" onClick={go} disabled={busy}>
        {busy ? "Opening GitHub…" : "Sign in with GitHub"}
      </Button>
      {error && <p className="adm-error">{error}</p>}
      {import.meta.env.DEV && <DevSignIn onSignedIn={onSignedIn} />}
    </Gate>
  );
}

/* Local development only: GitHub can only send people back to the live site. */
function DevSignIn({ onSignedIn }) {
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const creds = { email: f.get("email"), password: f.get("password"), name: "Local admin" };
    try {
      await api("/auth/sign-in/email", { method: "POST", body: creds }).catch(() =>
        api("/auth/sign-up/email", { method: "POST", body: creds })
      );
      onSignedIn();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form className="adm-dev" onSubmit={submit}>
      <p className="adm-muted">
        Local dev sign-in. New accounts start as members; promote one with{" "}
        <code>npx wrangler d1 execute pt-db --local --command "UPDATE user SET role='admin' WHERE email='…'"</code>
      </p>
      <input id="dev-email" name="email" type="email" placeholder="you@example.com" required />
      <input id="dev-password" name="password" type="password" placeholder="password (8+ characters)" minLength={8} required />
      <Button type="submit">Sign in locally</Button>
      {error && <p className="adm-error">{error}</p>}
    </form>
  );
}

function SignOutButton({ onDone }) {
  return (
    <Button onClick={() => signOut().finally(onDone)} className="adm-signout">
      Sign out
    </Button>
  );
}

function Shell({ me, section, onSignedOut }) {
  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
  const site = useSiteData();
  const { Component } = current;

  return (
    <div className="adm">
      <header className="adm-top">
        <a className="adm-top__brand mono" href="#admin">
          PT admin
        </a>
        <nav className="adm-nav" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#admin/${s.id}`} className="adm-nav__link" aria-current={s.id === current.id ? "page" : undefined}>
              {s.label}
            </a>
          ))}
        </nav>
        <div className="adm-top__me">
          {me.image && <img src={me.image} alt="" width="28" height="28" />}
          <span className="adm-muted">{me.name}</span>
          {/* A full page load, so the site shows the latest content. */}
          <a className="adm-link" href="/" target="_blank" rel="noopener">
            View site ↗
          </a>
          <SignOutButton onDone={onSignedOut} />
        </div>
      </header>
      <main className="adm-main">
        <h1 className="adm-title">{current.label}</h1>
        {site.error && <p className="adm-error">Couldn't load the content: {site.error}</p>}
        {site.data ? <Component data={site.data} reload={site.reload} /> : !site.error && <p className="adm-muted">Loading…</p>}
      </main>
    </div>
  );
}
