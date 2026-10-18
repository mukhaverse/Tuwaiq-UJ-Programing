import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useSpring } from "motion/react";
import Character from "../character/Character";
import BadgeShelf, { BadgeMark } from "../badges/Badge";
import Pill from "../ui/Pill";
import SplitHeading from "../ui/SplitHeading";
import { members, getMember, shortName, nameLang, yearLabel, roleLabel } from "../../data/members";
import { getBadge } from "../../data/badges";
import { announcement } from "../../data/announcement";
import { color } from "../../lib/palette";
import useMemberRoute from "./useMemberRoute";
import "./Members.css";

const pop = {
  initial: { opacity: 0, scale: 0.9, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
  transition: { type: "spring", stiffness: 380, damping: 28 },
};

// Filters are built from the members' `year` values, so they stay in sync with the roster.
const yearFilters = () => [
  { id: "all", label: "All" },
  ...[...new Set(members.map((m) => m.year))].sort((a, b) => a - b).map((y) => ({ id: y, label: yearLabel(y) })),
];

const earnedBadges = (member) => member.badges.map(getBadge).filter(Boolean);

// The leader and co-leader get their own tile hue and a big coloured title (Members.css).
const isLead = (member) => member.role !== "member";
const leadClass = (member) => (isLead(member) ? ` is-${member.role}` : "");

function LeadTitle({ member }) {
  if (!isLead(member)) return null;
  return (
    <p className="lead-title display">
      <span className="lead-title__mark" aria-hidden="true">
        {member.role === "leader" ? "★" : "✦"}
      </span>
      {roleLabel[member.role]}
    </p>
  );
}

function MemberCard({ member, onOpen, index }) {
  const tilt = { stiffness: 220, damping: 18 };
  const rx = useSpring(0, tilt);
  const ry = useSpring(0, tilt);
  const earned = earnedBadges(member);
  const { char, body, wear } = member.avatar;

  const onMove = (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - b.left) / b.width - 0.5;
    const py = (e.clientY - b.top) / b.height - 0.5;
    ry.set(px * 16);
    rx.set(py * -16);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.li layout {...pop} className="grid__item">
      <motion.button
        type="button"
        className={`card${leadClass(member)}`}
        onClick={() => {
          reset();
          onOpen(member.id);
        }}
        onPointerMove={onMove}
        onPointerLeave={reset}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap={{ scale: 0.97 }}
        style={{ rotateX: rx, rotateY: ry }}
        aria-label={`${member.name}, ${roleLabel[member.role]}, ${earned.length} ${earned.length === 1 ? "badge" : "badges"}. Open profile`}
      >
        <motion.div layoutId={`tile-${member.id}`} className="card__tile">
          <motion.div
            className="card__char"
            variants={{
              rest: { y: 0, scale: 1 },
              hover: { y: -12, scale: 1.05 },
            }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
          >
            <Character type={char} body={color(body)} wear={wear} blink={index * 0.6} className="sticker" />
          </motion.div>
          {/* Top-left corner: the leader / co-leader title, then any badges. */}
          {(isLead(member) || earned.length > 0) && (
            <div className="card__top">
              <LeadTitle member={member} />
              {earned.length > 0 && (
                <span className="card__badges" aria-hidden="true">
                  {earned.map((b) => (
                    <BadgeMark key={b.id} badge={b} size="2.4rem" />
                  ))}
                </span>
              )}
            </div>
          )}
          <motion.span
            className="card__play"
            variants={{ rest: { scale: 0, opacity: 0 }, hover: { scale: 1, opacity: 1 } }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.span>
          <h3 className="card__name display" lang={nameLang(member.name)}>
            {shortName(member)}
          </h3>
        </motion.div>
        <div className="card__meta">
          <p className="mono">
            {member.major} · {yearLabel(member.year)}
          </p>
        </div>
      </motion.button>
    </motion.li>
  );
}

// Links to other sites open in a new tab; in-page links (#journey) don't.
const external = (url) => (/^https?:/.test(url) ? { target: "_blank", rel: "noopener noreferrer" } : {});

/* The purple tile in the grid: the current announcement (edited in the admin
   panel), with a big label standing huge behind it. */
function NextCard({ onPass }) {
  const a = announcement;
  return (
    <motion.li layout {...pop} className="grid__item grid__item--promo">
      <section className="promo" aria-labelledby="next-title">
        {a.big && (
          <span className="promo__step display" aria-hidden="true">
            {a.big}
          </span>
        )}
        {a.eyebrow && (
          <p className="promo__eyebrow mono">
            <span className="promo__pulse" aria-hidden="true" />
            {a.eyebrow}
          </p>
        )}
        <h3 id="next-title" className="promo__title display">
          {a.title}
        </h3>
        {a.body && <p className="promo__note">{a.body}</p>}
        {(a.passLabel || a.ctaUrl) && (
          <div className="promo__actions">
            {a.passLabel && (
              <Pill as="button" type="button" variant="accent" onClick={onPass} icon={<BarcodeIcon />}>
                {a.passLabel}
              </Pill>
            )}
            {a.ctaUrl && (
              <Pill href={a.ctaUrl} {...external(a.ctaUrl)} variant={a.passLabel ? "" : "accent"} icon={isMap(a.ctaUrl) && <PinIcon />}>
                {a.ctaLabel || "Open"}
              </Pill>
            )}
          </div>
        )}
      </section>
    </motion.li>
  );
}

// A map link (Google or Apple Maps) gets a pin on its button.
const isMap = (url) => /^https:\/\/(maps\.app\.goo\.gl|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.apple\.com)\b/.test(url);

function PinIcon() {
  return (
    <svg className="promo__icon promo__icon--pin" viewBox="0 0 10 12" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M3 0h4v1h1v1h1v4H8v2H7v2H6v2H4v-2H3V8H2V6H1V2h1V1h1zM4 3v2h2V3z" fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

function BarcodeIcon() {
  return (
    <svg className="promo__icon" viewBox="0 0 16 12" aria-hidden="true" shapeRendering="crispEdges">
      <path d="M0 0h2v12H0zM3 0h1v12H3zM5 0h2v12H5zM8 0h1v12H8zM10 0h1v12h-1zM12 0h2v12h-2zM15 0h1v12h-1z" fill="currentColor" />
    </svg>
  );
}

// Escape closes, the page underneath stops scrolling, and focus goes back where it was.
function useDialog(onClose) {
  // Read during render, before the close button's autoFocus takes focus away.
  const [returnTo] = useState(() => document.activeElement);
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
}

/* The entry pass behind the tile's barcode button: the uploaded barcode on a
   white ticket, or a blurred stand-in until there is one. */
function PassModal({ onClose }) {
  const a = announcement;
  useDialog(onClose);

  return (
    <>
      <motion.div className="modal__backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <div className="modal__wrap" role="dialog" aria-modal="true" aria-labelledby="pass-title">
        <motion.div className="pass" {...pop}>
          <p className="pass__eyebrow mono">Entry pass</p>
          <h3 id="pass-title" className="pass__title display">
            {a.title}
          </h3>
          <div className="pass__tear" aria-hidden="true" />
          {a.passImage ? (
            <>
              <img className="pass__code" src={a.passImage} alt={`Entry barcode for ${a.title}`} />
              <p className="pass__hint">Show this at the entrance. Turn your screen brightness up if it won't scan.</p>
            </>
          ) : (
            <>
              <div className="pass__code pass__code--soon" aria-hidden="true">
                <span className="pass__soon mono">Coming soon</span>
              </div>
              <p className="pass__hint">Your barcode isn't ready yet. It shows up right here before the event, so check back.</p>
            </>
          )}
          <button type="button" className="modal__x" onClick={onClose} aria-label="Close" autoFocus>
            ✕
          </button>
        </motion.div>
      </div>
    </>
  );
}

async function sendBio(id, bio) {
  const res = await fetch(`/api/bios/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bio }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't send it. Try again in a moment.");
}

/* The bio on a profile. Anyone can suggest a new one; it goes live once an admin
   approves it in the admin panel (Members → Bio suggestions). */
function Bio({ member }) {
  const bio = member.bio ?? "";
  const [draft, setDraft] = useState(null); // null = not editing
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await sendBio(member.id, draft);
      setSent(true);
      setDraft(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (draft === null)
    return (
      <>
        {bio ? <p className="modal__line">{bio}</p> : <p className="modal__line modal__line--soon">Bio coming soon.</p>}
        {sent ? (
          <p className="modal__edit mono" role="status">
            Thanks! It shows up here once it's approved.
          </p>
        ) : (
          <button type="button" className="modal__edit mono" onClick={() => setDraft(bio)}>
            {bio ? "Suggest a new bio" : "Is this you? Write your bio"}
          </button>
        )}
      </>
    );

  return (
    <form className="modal__bio" onSubmit={save}>
      <textarea
        aria-label="Bio"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        maxLength={600}
        required
        dir="auto"
        placeholder="One or two sentences: what you're into, what you're building."
        autoFocus
      />
      {error && <p className="modal__error">{error}</p>}
      <div className="modal__bio-actions">
        <Pill as="button" type="submit" variant="accent" disabled={sending || !draft.trim()}>
          {sending ? "Sending…" : "Send for approval"}
        </Pill>
        <button type="button" className="modal__edit mono" onClick={() => setDraft(null)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function MemberModal({ member, onClose }) {
  const earned = earnedBadges(member);
  const { char, body, wear } = member.avatar;
  useDialog(onClose);

  return (
    <>
      <motion.div
        className="modal__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <div className="modal__wrap" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <motion.div
          layoutId={`tile-${member.id}`}
          className={`modal${leadClass(member)}`}
          style={{ borderRadius: 12 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <motion.div
            className="modal__body"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            {isLead(member) ? <LeadTitle member={member} /> : <p className="mono">{roleLabel.member}</p>}
            <h3 id="modal-title" className="display" lang={nameLang(member.name)}>
              {member.name}
            </h3>
            <Bio member={member} />
            <div className="modal__facts">
              <p className="modal__slot mono">{member.major}</p>
              <p className="modal__slot mono">{yearLabel(member.year)}</p>
            </div>

            <p className="modal__label mono">Badges · {earned.length}</p>
            <BadgeShelf earned={earned} />
          </motion.div>
          <motion.div
            className="modal__char"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          >
            <Character type={char} body={color(body)} wear={wear} className="sticker" />
          </motion.div>
          <button type="button" className="modal__x" onClick={onClose} aria-label="Close" autoFocus>
            ✕
          </button>
        </motion.div>
      </div>
    </>
  );
}

export default function Members() {
  const [year, setYear] = useState("all");
  // The pass is opened from the tile but rendered out here: the grid's transforms would trap a fixed modal.
  const [pass, setPass] = useState(false);
  const closePass = useCallback(() => setPass(false), []);
  const route = useMemberRoute();

  const list = members.filter((m) => year === "all" || m.year === year);
  const items = [...list];
  if (announcement) items.splice(Math.min(2, items.length), 0, { promo: true, id: "promo" });
  const filters = yearFilters();
  const open = route.id ? getMember(route.id) : null;

  return (
    <section className="shows section-pad" id="members">
      <SplitHeading className="shows__heading display">
        <span>Meet</span> <span>the members</span>
      </SplitHeading>

      <LayoutGroup>
        <div className="filters" role="group" aria-label="Filter members by year">
          {filters.map((f) => {
            const count = f.id === "all" ? members.length : members.filter((m) => m.year === f.id).length;
            const active = year === f.id;
            return (
              <button
                key={f.id}
                type="button"
                className={`filter ${active ? "is-active" : ""}`}
                aria-pressed={active}
                onClick={() => setYear(f.id)}
              >
                {active && (
                  <motion.span
                    layoutId="filter-bg"
                    className="filter__bg"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                )}
                <span className="filter__label">{f.label}</span>
                <sup className="filter__count">{count}</sup>
              </button>
            );
          })}
        </div>

        <motion.ul className="grid" layout>
          <AnimatePresence mode="popLayout">
            {items.map((item, i) =>
              item.promo ? (
                <NextCard key="promo" onPass={() => setPass(true)} />
              ) : (
                <MemberCard key={item.id} member={item} index={i} onOpen={route.open} />
              )
            )}
          </AnimatePresence>
        </motion.ul>

        <AnimatePresence>{open && <MemberModal key={open.id} member={open} onClose={route.close} />}</AnimatePresence>
        <AnimatePresence>{pass && announcement && <PassModal onClose={closePass} />}</AnimatePresence>
      </LayoutGroup>
    </section>
  );
}
