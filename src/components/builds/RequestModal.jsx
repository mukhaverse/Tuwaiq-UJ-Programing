import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { KINDS, requests, ticket, tracks } from "../../data/projects";
import { members } from "../../data/members";
import { color } from "../../lib/palette";
import Character from "../character/Character";
import Pill from "../ui/Pill";

const EMPTY = { kind: "", title: "", details: "", deadline: "", name: "", trackId: "", track: "", contact: "", website: "" };
// The track picker's "not in the list" option; picking it shows a text box instead.
const OTHER = "__other";

async function send(values) {
  const res = await fetch("/api/requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(values),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't send it. Try again in a moment.");
  return data.id;
}

/* The request form, printed as a ticket. Once sent, it gets stamped with its number. */
export default function RequestModal({ onClose }) {
  const [v, setV] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sentId, setSentId] = useState(null);
  const [returnTo] = useState(() => document.activeElement);
  const set = (field) => (e) => setV((prev) => ({ ...prev, [field]: e.target.value }));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      returnTo?.focus?.({ preventScroll: true });
    };
  }, [onClose, returnTo]);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const { trackId, track, ...rest } = v;
      // A track from the list goes by id; anything else as typed.
      setSentId(await send(trackId && trackId !== OTHER ? { ...rest, trackId } : { ...rest, track }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.div className="req__backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="req__wrap" role="dialog" aria-modal="true" aria-labelledby="req-title">
        <motion.div
          className="req"
          initial={{ opacity: 0, y: 60, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, y: 40, rotate: 1.5, transition: { duration: 0.18 } }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          <header className="req__strip mono">
            <span>// build request</span>
            <span>{sentId ? `#${ticket(sentId)}` : "#PT-???"}</span>
          </header>
          {!requests.open && sentId === null ? (
            <Closed onClose={onClose} />
          ) : sentId !== null ? (
            <Sent id={sentId} contact={v.contact} onClose={onClose} />
          ) : (
            <form className="req__form" onSubmit={submit}>
              <h2 id="req-title" className="req__title display">
                What should we build?
              </h2>

              <fieldset className="req__kinds">
                <legend className="req__label">
                  It's a… <span className="req__optional">optional</span>
                </legend>
                {KINDS.map((k) => (
                  <label key={k.id} className="req__kind">
                    {/* Clicking the picked one again un-picks it. */}
                    <input
                      type="radio"
                      name="kind"
                      value={k.id}
                      checked={v.kind === k.id}
                      onChange={set("kind")}
                      onClick={() => v.kind === k.id && setV((prev) => ({ ...prev, kind: "" }))}
                    />
                    <span className="req__glyph" aria-hidden="true">
                      {k.glyph}
                    </span>
                    {k.label}
                  </label>
                ))}
              </fieldset>

              <label className="req__field">
                <span className="req__label">Give it a name</span>
                <input id="req-name-it" value={v.title} onChange={set("title")} required maxLength={80} placeholder="Feedback survey for the design workshop" />
              </label>
              <label className="req__field">
                <span className="req__label">Tell us more</span>
                <textarea
                  id="req-details"
                  value={v.details}
                  onChange={set("details")}
                  required
                  maxLength={3000}
                  rows={4}
                  placeholder="What it should do, who will use it, anything you've already got (links welcome)."
                />
              </label>
              <label className="req__field">
                <span className="req__label">
                  When do you need it? <span className="req__optional">optional</span>
                </span>
                <input id="req-deadline" value={v.deadline} onChange={set("deadline")} maxLength={60} placeholder="Before week 8, ASAP, whenever…" />
              </label>

              <div className="req__cut" aria-hidden="true">
                <span>✂</span>
              </div>

              <div className="req__row">
                <label className="req__field">
                  <span className="req__label">Your name</span>
                  <input id="req-person" value={v.name} onChange={set("name")} required maxLength={80} autoComplete="name" />
                </label>
                <TrackField v={v} set={set} />
              </div>
              <label className="req__field">
                <span className="req__label">How do we reach you?</span>
                <input id="req-contact" value={v.contact} onChange={set("contact")} required maxLength={120} placeholder="Email, phone or @handle" />
                <span className="req__hint">Only the track's admins see this.</span>
              </label>

              {/* Honeypot: hidden from people, so only bots fill it in. */}
              <input className="req__trap" name="website" value={v.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" />

              {error && (
                <p className="req__error" role="alert">
                  {error}
                </p>
              )}
              <div className="req__actions">
                <Pill as="button" type="submit" variant="solid" disabled={sending}>
                  {sending ? "Sending…" : "Send request"}
                </Pill>
              </div>
            </form>
          )}
          <button type="button" className="req__x" onClick={onClose} aria-label="Close" autoFocus>
            ✕
          </button>
        </motion.div>
      </div>
    </>
  );
}

/* After sending: the ticket number gets stamped, and someone from the track cheers. */
function Sent({ id, contact, onClose }) {
  const [cheer] = useState(() => members[Math.floor(Math.random() * members.length)]);
  return (
    <div className="req__sent" role="status">
      <div className="req__stamp-row">
        <p className="req__number display">#{ticket(id)}</p>
        <motion.p
          className="req__stamp mono"
          initial={{ scale: 2.6, opacity: 0, rotate: -24 }}
          animate={{ scale: 1, opacity: 1, rotate: -12 }}
          transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.15 }}
        >
          Received
        </motion.p>
      </div>
      <h2 id="req-title" className="req__title display">
        It's on our desk.
      </h2>
      <p className="req__body">
        We'll look it over and reach out through <strong>{contact}</strong>. Once we start building, it shows up under Builds on the site. Keep the
        number in case you need to ask about it.
      </p>
      {cheer && (
        <motion.div
          className="req__cheer"
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 0.5, repeat: 2, repeatDelay: 0.25, delay: 0.5 }}
          aria-hidden="true"
        >
          <Character type={cheer.avatar.char} body={color(cheer.avatar.body)} className="sticker" />
        </motion.div>
      )}
      <Pill as="button" type="button" variant="accent" onClick={onClose}>
        Back to the site
      </Pill>
    </div>
  );
}

/* Their track: picked from the list, or typed in when it's not there (or there's no list yet). */
function TrackField({ v, set }) {
  const typing = !tracks.length || v.trackId === OTHER;
  return (
    <div className="req__field">
      <label className="req__label" htmlFor={typing && !tracks.length ? "req-track" : "req-track-pick"}>
        Your track
      </label>
      {tracks.length > 0 && (
        <select id="req-track-pick" value={v.trackId} onChange={set("trackId")} required>
          <option value="" disabled>
            Pick one…
          </option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value={OTHER}>Other…</option>
        </select>
      )}
      {typing && (
        <input
          id="req-track"
          className={tracks.length ? "req__other" : undefined}
          value={v.track}
          onChange={set("track")}
          required
          maxLength={60}
          placeholder="Which track?"
          aria-label={tracks.length ? "Your track's name" : undefined}
        />
      )}
    </div>
  );
}

/* Someone opened a #request link while requests are switched off. */
function Closed({ onClose }) {
  return (
    <div className="req__sent">
      <p className="req__stamp req__stamp--closed mono">Closed</p>
      <h2 id="req-title" className="req__title display">
        Not taking requests right now.
      </h2>
      <p className="req__body">Our hands are full at the moment. Check back soon, or catch us at the next meeting.</p>
      <Pill as="button" type="button" variant="accent" onClick={onClose}>
        Back to the site
      </Pill>
    </div>
  );
}
