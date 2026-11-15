// The live board page (/live/): the question on top, the ridge of answers, and the
// composer members answer from. Leaders (signed in on the admin page) get controls.
import { useCallback, useEffect, useRef, useState } from "react";
import Character from "../components/character/Character";
import { api } from "./api";
import { colourOf } from "./colour";
import Ridge from "./Ridge";
import useLiveBoard from "./useLiveBoard";

const ME_KEY = "pt:live-me";
const MAX = 140;

const store = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(ME_KEY) || "null");
    } catch {
      return null;
    }
  },
  set(v) {
    try {
      if (v) localStorage.setItem(ME_KEY, JSON.stringify(v));
      else localStorage.removeItem(ME_KEY);
    } catch {
      // Private mode: they type their name again next time.
    }
  },
};

export default function LiveApp() {
  const board = useLiveBoard();
  const { session, answers, apply } = board;
  const [leader, setLeader] = useState(false);
  const [present, setPresent] = useState(false);
  const [note, setNote] = useState("");

  // Leaders are admins signed in on the admin page; the server checks every action again.
  useEffect(() => {
    api("/me")
      .then((d) => setLeader(d.user?.role === "admin"))
      .catch(() => {});
  }, []);

  const exitPresent = useCallback(() => {
    setPresent(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);
  const enterPresent = () => {
    setPresent(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };
  useEffect(() => {
    document.body.classList.toggle("present", present);
    if (!present) return;
    const key = (e) => e.key === "Escape" && exitPresent();
    // Leaving full screen (Esc there is the browser's) leaves presentation mode too.
    const fs = () => !document.fullscreenElement && setPresent(false);
    window.addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", fs);
    return () => {
      window.removeEventListener("keydown", key);
      document.removeEventListener("fullscreenchange", fs);
    };
  }, [present, exitPresent]);

  const hide = async (id) => {
    try {
      await api(`/live/leader/answers/${id}/hide`, {});
      apply({ type: "answer:hidden", sessionId: session.id, id });
    } catch (e) {
      setNote(e.message);
    }
  };

  const open = Boolean(session?.open);

  return (
    <div className="wrap">
      {present && (
        <button type="button" className="btn exit" onClick={exitPresent}>
          EXIT · ESC
        </button>
      )}
      <nav className="topnav" aria-label="Main">
        <a className="brand" href="/">
          PROGRAMMING TRACK
        </a>
        <div className="links">
          <a href="/">HOME</a>
          <a href="/live/" className="on" aria-current="page">
            {open && <i className="dot" />}LIVE BOARD
          </a>
        </div>
      </nav>

      <section className="q">
        <div className="q__main">
          <div className={`q__state${open ? "" : " is-closed"}`}>
            {open && <i className="dot" />}
            <span>{session ? (open ? "LIVE · OPEN" : "CLOSED") : "WAITING"}</span>
            {board.status !== "live" && board.loaded && (
              <span className="conn">{board.status === "polling" ? "RECONNECTING… (CHECKING EVERY 3S)" : "RECONNECTING…"}</span>
            )}
          </div>
          <h1 dir="auto">{session ? session.question : "No question yet"}</h1>
        </div>
        <div className="q__count" aria-live="polite">
          <div className="n">{answers.length}</div>
          <div className="l">{answers.length === 1 ? "ANSWER" : "ANSWERS"}</div>
        </div>
      </section>

      <Ridge
        answers={answers}
        fresh={board.fresh}
        loaded={board.loaded}
        present={present}
        leader={leader && !present}
        onHide={hide}
        emptyText={session ? "BE THE FIRST TO CLIMB" : "WAITING FOR THE FIRST QUESTION"}
      />

      {!present && <Composer session={session} onSent={(answer) => apply({ type: "answer:new", sessionId: session.id, answer })} />}
      {note && !present && (
        <p className="note" role="alert">
          {note}
        </p>
      )}
      {leader && !present && <LeaderPanel session={session} hasAnswers={answers.length > 0} apply={apply} refresh={board.refresh} onPresent={enterPresent} />}
    </div>
  );
}

/* ---------- members: name, then answer ---------- */

function Composer({ session, onSent }) {
  const [me, setMe] = useState(store.get);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  // Their character may have changed since they joined: look it up again quietly.
  useEffect(() => {
    const saved = store.get();
    if (!saved) return;
    api("/live/name", { name: saved.name })
      .then(({ member }) => {
        const next = { name: saved.name, member };
        store.set(next);
        setMe(next);
      })
      .catch((e) => {
        if (e.status === 404) {
          store.set(null);
          setMe(null);
        }
      });
  }, []);

  const join = async () => {
    const typed = name.trim();
    if (!typed || busy) return;
    setBusy(true);
    setError("");
    try {
      const { member } = await api("/live/name", { name: typed });
      const next = { name: typed, member };
      store.set(next);
      setMe(next);
      setName("");
      setTimeout(() => input.current?.focus(), 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const t = text.trim();
    if (!t || busy || !session?.open) return;
    setBusy(true);
    setError("");
    try {
      const { answer } = await api("/live/answers", { sessionId: session.id, name: me.name, text: t });
      setText("");
      onSent(answer);
    } catch (e) {
      if (e.status === 404) {
        store.set(null);
        setMe(null);
      }
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const notMe = () => {
    store.set(null);
    setMe(null);
    setText("");
    setError("");
  };

  if (!me) {
    return (
      <div className="composer">
        <form
          className="composer__row"
          onSubmit={(e) => {
            e.preventDefault();
            join();
          }}
        >
          <label htmlFor="live-name" className="composer__label">
            YOUR NAME
          </label>
          <input
            id="live-name"
            dir="auto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="As it is on the club list"
            autoComplete="name"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "composer-error" : undefined}
          />
          <button type="submit" className="btn btn--pri" disabled={busy || !name.trim()}>
            JOIN
          </button>
        </form>
        {error && (
          <p className="composer__error" id="composer-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const closed = !session?.open;
  const left = MAX - [...text].length;
  return (
    <div className="composer">
      <div className="composer__row">
        <div className="me">
          <span className="me__icon">
            <Character type={me.member.avatar.char} body={colourOf(me.member)} wear={me.member.avatar.wear} />
          </span>
          <span dir="auto" style={{ color: colourOf(me.member) }}>
            {me.member.name}
          </span>
          <button type="button" className="me__change" onClick={notMe}>
            not you?
          </button>
        </div>
        <label htmlFor="live-answer" className="sr-only">
          Your answer
        </label>
        <input
          id="live-answer"
          ref={input}
          dir="auto"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={MAX}
          placeholder={closed ? "Answers closed" : "Type your answer…"}
          autoComplete="off"
          disabled={closed}
        />
        <span className={`composer__left${left < 15 ? " is-low" : ""}`} aria-hidden="true">
          {left}
        </span>
        <button type="button" className="btn btn--pri" onClick={send} disabled={closed || busy || !text.trim()}>
          SEND
        </button>
      </div>
      {closed && <p className="composer__closed">{session ? "ANSWERS CLOSED" : "WAITING FOR A QUESTION"}</p>}
      {error && (
        <p className="composer__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- leaders ---------- */

function LeaderPanel({ session, hasAnswers, apply, refresh, onPresent }) {
  const [question, setQuestion] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const publish = () =>
    run(async () => {
      const { session: next } = await api("/live/leader/publish", { question: question.trim() });
      apply({ type: "session:new", session: next });
      setQuestion("");
    });
  const askPublish = () => {
    if (!question.trim()) return;
    if (hasAnswers) setConfirm({ title: "PUBLISH A NEW QUESTION?", text: "The board clears for everyone and shows the new question.", yes: publish });
    else publish();
  };
  const toggle = () =>
    run(async () => {
      const { session: next } = await api("/live/leader/state", { open: !session.open });
      apply({ type: "session:state", session: next });
    });
  const reset = () =>
    run(async () => {
      await api("/live/leader/reset", {});
      refresh();
    });

  return (
    <details className="lead">
      <summary>LEADER</summary>
      <div className="lead__body">
        <form
          className="lead__row"
          onSubmit={(e) => {
            e.preventDefault();
            askPublish();
          }}
        >
          <label htmlFor="live-question" className="sr-only">
            New question
          </label>
          <input id="live-question" dir="auto" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={160} placeholder="Write a new question…" />
          <button type="submit" className="btn btn--pri" disabled={busy || !question.trim()}>
            PUBLISH
          </button>
        </form>
        <div className="lead__row">
          <button type="button" className="btn" onClick={toggle} disabled={busy || !session}>
            {session?.open ? "CLOSE ANSWERS" : "OPEN ANSWERS"}
          </button>
          <button
            type="button"
            className="btn"
            disabled={busy || !session}
            onClick={() => setConfirm({ title: "RESET THE BOARD?", text: "All answers to this question are cleared. The question stays.", yes: reset })}
          >
            RESET BOARD
          </button>
          <button type="button" className="btn" onClick={onPresent}>
            PRESENTATION MODE
          </button>
          <span className="lead__hint">Click a sign to hide it.</span>
        </div>
        {error && (
          <p className="composer__error" role="alert">
            {error}
          </p>
        )}
      </div>
      {confirm && (
        <Confirm
          {...confirm}
          onNo={() => setConfirm(null)}
          onYes={() => {
            setConfirm(null);
            confirm.yes();
          }}
        />
      )}
    </details>
  );
}

function Confirm({ title, text, onYes, onNo }) {
  const yes = useRef(null);
  useEffect(() => {
    yes.current?.focus();
    const key = (e) => e.key === "Escape" && onNo();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onNo]);
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onNo()}>
      <div className="box" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-text">
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-text">{text}</p>
        <div className="box__row">
          <button type="button" className="btn" onClick={onNo}>
            CANCEL
          </button>
          <button type="button" ref={yes} className="btn btn--pri" onClick={onYes}>
            YES
          </button>
        </div>
      </div>
    </div>
  );
}
