// Talks to the Worker API. Throws an Error with the server's message on failure.
export async function api(path, { method = "GET", body, form } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export async function signInWithGitHub() {
  const { url } = await api("/auth/sign-in/social", {
    method: "POST",
    body: { provider: "github", callbackURL: "/#admin", errorCallbackURL: "/#admin" },
  });
  window.location.href = url;
}

export const signOut = () => api("/auth/sign-out", { method: "POST", body: {} });
