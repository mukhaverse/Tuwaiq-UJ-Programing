// Sending email (the one-time codes members use to prove they own their roster email).
// Off until it's configured: EMAIL_PROVIDER + EMAIL_FROM in wrangler.jsonc and the
// EMAIL_API_KEY secret. See README → Portfolio task → Email.
//
//   resend   https://resend.com     needs a domain you own, verified in Resend
//   brevo    https://brevo.com      can send from a single verified address (no domain)
//   console  local development only: the email is printed in the `npm run dev` terminal

/** Email + password sign-in and the console mailer, only while the site runs on localhost. */
export const devLogin = (env: Env) => env.DEV_LOGIN === "true" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(env.BETTER_AUTH_URL);

type Provider = "resend" | "brevo" | "console";

/** The mailer in use, or null when email isn't set up (and members can't sign up). */
export function emailProvider(env: Env): Provider | null {
  const p = (env.EMAIL_PROVIDER ?? "").trim();
  if (p === "console") return devLogin(env) ? "console" : null;
  if ((p === "resend" || p === "brevo") && env.EMAIL_API_KEY && env.EMAIL_FROM) return p;
  return null;
}

/** "Programming Track <codes@example.com>" → its parts. */
function parseFrom(from: string) {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || undefined, email: m[2] } : { name: undefined, email: from.trim() };
}

export type Email = { to: string; subject: string; text: string; html: string };

/** Sends one email. Throws when the provider refuses it. */
export async function sendEmail(env: Env, email: Email): Promise<void> {
  const provider = emailProvider(env);
  if (!provider) throw new Error("Email isn't configured");

  if (provider === "console") {
    console.log(`\n[dev email] to ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    return;
  }

  let res: Response;
  if (provider === "resend") {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.EMAIL_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [email.to], subject: email.subject, text: email.text, html: email.html }),
    });
  } else {
    res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env.EMAIL_API_KEY!, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: parseFrom(env.EMAIL_FROM!),
        to: [{ email: email.to }],
        subject: email.subject,
        textContent: email.text,
        htmlContent: email.html,
      }),
    });
  }
  if (!res.ok) throw new Error(`${provider} refused the email (${res.status}): ${(await res.text()).slice(0, 300)}`);
}
