// What people who can't see a task yet get: sign in (members by email, leaders with
// GitHub), "we couldn't find your account", or "your access is paused". Nothing private
// is shown on any of these.
// (Verify, the emailed-code step, is only used if MEMBER_VERIFY=email_code is turned back on.)
import { useState } from "react";
import { api, refreshSession, signInWithEmail, signInWithGitHub, signOut } from "./session";

// GitHub sign-in comes back with ?signin=refused when the account may not sign in.
function takeRefused() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("signin") && !url.searchParams.has("error")) return false;
  ["signin", "error", "error_description"].forEach((k) => url.searchParams.delete(k));
  window.history.replaceState(null, "", url);
  return true;
}
const refused = takeRefused();

const NOT_FOUND = "We couldn't find your account. Contact a track leader.";

function Card({ eyebrow = "Build your portfolio", title, children }) {
  return (
    <div className="pf-gate">
      <div>
        <p className="eyebrow mono">{eyebrow}</p>
        <h1 className="pf-display pf-display--md">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function SignIn({ signupOpen }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(refused ? "That GitHub account isn't a track leader." : null);

  const member = async (e) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy("email");
    setError(null);
    try {
      await signInWithEmail(email.trim());
    } catch (err) {
      setError(err.status === 404 ? NOT_FOUND : err.message);
      setBusy(null);
    }
  };
  const leader = async () => {
    setBusy("github");
    setError(null);
    try {
      await signInWithGitHub();
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  };

  return (
    <Card
      title={
        <>
          Your portfolio <em>task.</em>
        </>
      }
    >
      {signupOpen ? (
        <form className="pf-form" onSubmit={member}>
          <p className="pf-lede">Enter the email you registered with in Tuwaiq Club.</p>
          <div className="pf-row" style={{ alignItems: "flex-end" }}>
            <label className="pf-field" style={{ flex: "1 1 260px" }}>
              <span>Your club email</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <button type="submit" className="pill pill--solid" disabled={Boolean(busy) || !email.trim()}>
              {busy === "email" ? "Signing in…" : "Sign in"} →
            </button>
          </div>
        </form>
      ) : (
        <p className="pf-note">Member sign-in opens soon.</p>
      )}
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
      <p className="pf-muted pf-small">
        Track leader?{" "}
        <button type="button" className="pf-textbtn" onClick={leader} disabled={Boolean(busy)}>
          {busy === "github" ? "Opening GitHub…" : "Sign in with GitHub"}
        </button>
      </p>
      {import.meta.env.DEV && <DevSignIn />}
    </Card>
  );
}

/* Local development only (DEV_LOGIN): GitHub can only send people back to the live site. */
function DevSignIn() {
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const creds = { email: f.get("email"), password: f.get("password"), name: f.get("name") || "Local tester" };
    try {
      await api("/auth/sign-in/email", { method: "POST", body: creds }).catch(() => api("/auth/sign-up/email", { method: "POST", body: creds }));
      await refreshSession();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <form className="pf-dev" onSubmit={submit}>
      <p className="pf-muted pf-small">
        Local dev sign-in, for leader test accounts (members use the email box above). Make an account a leader with{" "}
        <code>npx wrangler d1 execute pt-db --local --command "UPDATE user SET role='admin' WHERE email='…'"</code>
      </p>
      <input name="name" placeholder="name" aria-label="Name" />
      <input name="email" type="email" placeholder="login@example.com" aria-label="Email" required />
      <input name="password" type="password" placeholder="password (8+)" aria-label="Password" minLength={8} required />
      <button type="submit" className="pf-btn">
        Sign in locally
      </button>
      {error && <p className="pf-error">{error}</p>}
    </form>
  );
}

/** Signed in but not on the roster (no verified email matched, no hand link). */
export function NotFound({ name }) {
  return (
    <Card
      title={
        <>
          We couldn't find your <em>account.</em>
        </>
      }
    >
      <p className="pf-lede">
        Signed in as <strong>{name}</strong>, which isn't a member on the roster. Contact a track leader.
      </p>
      <SignOut />
    </Card>
  );
}

/** Signed in but not linked: email → code → linked. Only while email codes are turned on. */
export function Verify({ name, signupOpen }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  if (!signupOpen) {
    return (
      <Card
        title={
          <>
            Almost <em>there.</em>
          </>
        }
      >
        <p className="pf-lede">
          Signed in as <strong>{name}</strong>. Member sign-up opens soon; the leaders will let you know.
        </p>
        <SignOut />
      </Card>
    );
  }

  const send = async (e) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api("/portfolio/verify/start", { method: "POST", body: { email } });
      setNotice(r.message);
      setStep("code");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/portfolio/verify/confirm", { method: "POST", body: { code } });
      await refreshSession();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Card
      title={
        <>
          Confirm you're a <em>member.</em>
        </>
      }
    >
      <p className="pf-lede">
        Signed in as <strong>{name}</strong>. Enter the email you registered with Tuwaiq Club and we'll send it a code. Once only.
      </p>
      <ol className="pf-steps-mini" aria-label="Steps">
        <li className={step === "email" ? "is-current" : ""}>
          <b>01</b>Email
        </li>
        <li className={step === "code" ? "is-current" : ""}>
          <b>02</b>Code
        </li>
      </ol>
      {step === "email" ? (
        <form className="pf-form" onSubmit={send}>
          <label className="pf-field">
            <span>Tuwaiq Club email</span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <button type="submit" className="pill pill--solid" style={{ justifySelf: "start" }} disabled={busy || !email}>
            {busy ? "Sending…" : "Send code"} →
          </button>
        </form>
      ) : (
        <form className="pf-form" onSubmit={confirm}>
          {notice && <p className="pf-note">{notice}</p>}
          <label className="pf-field">
            <span>6-digit code</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="pf-code"
              placeholder="000000"
            />
          </label>
          <div className="pf-row">
            <button type="submit" className="pill pill--solid" disabled={busy || code.length !== 6}>
              {busy ? "Checking…" : "Confirm"}
            </button>
            <button type="button" className="pf-textbtn" onClick={() => (setStep("email"), setCode(""), setError(null))}>
              Use a different email
            </button>
            <button type="button" className="pf-textbtn" onClick={send} disabled={busy}>
              Send a new code
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="pf-error" role="alert">
          {error}
        </p>
      )}
      <p className="pf-muted pf-small">No code, or can't open that inbox? Ask a track leader.</p>
      <SignOut />
    </Card>
  );
}

export function Blocked({ name }) {
  return (
    <Card
      title={
        <>
          Access <em>paused.</em>
        </>
      }
    >
      <p className="pf-lede">
        Signed in as <strong>{name}</strong>. A track leader paused access to this membership. Think that's a mistake? Talk to them.
      </p>
      <SignOut />
    </Card>
  );
}

function SignOut() {
  return (
    <button type="button" className="pf-textbtn pf-small" style={{ justifySelf: "start", color: "var(--muted)" }} onClick={() => signOut()}>
      Sign out
    </button>
  );
}
