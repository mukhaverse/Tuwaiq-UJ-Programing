// Who's signed in for the portfolio task, shared by the header, the home page card and
// the portfolio pages. Fetched once, refreshed after anything that changes it.
//
//   kind: "guest" | "unverified" | "blocked" | "member" | "leader"
//   (plus name, image, memberName, unread, signupOpen)
import { useSyncExternalStore } from "react";

let state = { loading: true, kind: "guest", signupOpen: false, unread: 0 };
const listeners = new Set();
let inflight = null;

function set(next) {
  state = next;
  listeners.forEach((l) => l());
}

export function refreshSession() {
  inflight ??= fetch("/api/portfolio/session", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { kind: "guest", signupOpen: false }))
    .catch(() => ({ kind: "guest", signupOpen: false, offline: true }))
    .then((s) => set({ loading: false, unread: 0, ...s }))
    .finally(() => (inflight = null));
  return inflight;
}

export function usePortfolioSession() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      if (state.loading && !inflight) refreshSession();
      return () => listeners.delete(l);
    },
    () => state
  );
}

/** Talks to the API. Throws an Error carrying the server's message. */
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Members: sign in with the email they registered with in the club. */
export async function signInWithEmail(email) {
  await api("/auth/member/sign-in", { method: "POST", body: { email } });
  await refreshSession();
}

/** Leaders: GitHub, coming back to the portfolio page. */
export async function signInWithGitHub() {
  const back = "/#portfolio";
  const { url } = await api("/auth/sign-in/social", { method: "POST", body: { provider: "github", callbackURL: back, errorCallbackURL: "/?signin=refused#portfolio" } });
  window.location.href = url;
}

export async function signOut() {
  await api("/auth/sign-out", { method: "POST", body: {} });
  await refreshSession();
}
