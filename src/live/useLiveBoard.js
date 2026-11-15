// The board's state, kept live over a WebSocket to /api/live/ws (worker/live/).
// Drops reconnect with backoff, and every (re)connect starts with the whole board,
// so nothing is lost while away. If WebSockets keep failing, it polls every 3s.
import { useCallback, useEffect, useReducer, useRef } from "react";

const POLL_MS = 3000;
const PING_MS = 25000;
// Failed connects in a row before falling back to polling.
const FAILS_BEFORE_POLL = 3;

const initial = { loaded: false, session: null, answers: [], fresh: new Set(), status: "connecting" };

const byId = (a, b) => a.id - b.id;

function reducer(state, msg) {
  switch (msg.type) {
    case "sync": {
      // Answers this page hasn't seen for the same question climb in; a first load or
      // a new question just appears.
      const same = state.loaded && state.session?.id === msg.session?.id;
      const known = new Set(state.answers.map((a) => a.id));
      const fresh = same && msg.animate ? new Set([...state.fresh, ...msg.answers.filter((a) => !known.has(a.id)).map((a) => a.id)]) : new Set();
      return { ...state, loaded: true, session: msg.session, answers: [...msg.answers].sort(byId), fresh };
    }
    case "answer:new": {
      if (msg.sessionId !== state.session?.id || state.answers.some((a) => a.id === msg.answer.id)) return state;
      return { ...state, answers: [...state.answers, msg.answer].sort(byId), fresh: new Set(state.fresh).add(msg.answer.id) };
    }
    case "answer:hidden":
      if (msg.sessionId !== state.session?.id) return state;
      return { ...state, answers: state.answers.filter((a) => a.id !== msg.id) };
    case "session:new":
      if (state.session?.id === msg.session.id) return state;
      return { ...state, loaded: true, session: msg.session, answers: [], fresh: new Set() };
    case "session:state":
      if (state.session?.id !== msg.session.id) return state;
      return { ...state, session: msg.session };
    case "status":
      return state.status === msg.status ? state : { ...state, status: msg.status };
    default:
      return state;
  }
}

export default function useLiveBoard() {
  const [state, dispatch] = useReducer(reducer, initial);
  const pollNow = useRef(() => {});

  useEffect(() => {
    let ws = null;
    let stopped = false;
    let fails = 0;
    let retryTimer = 0;
    let pollTimer = 0;
    let pingTimer = 0;
    let pongTimer = 0;

    const poll = async (animate = true) => {
      try {
        const res = await fetch("/api/live/state", { cache: "no-store" });
        if (res.ok) dispatch({ type: "sync", animate, ...(await res.json()) });
      } catch {
        // Offline: the next poll or reconnect catches up.
      }
    };
    pollNow.current = () => poll(true);

    const startPolling = () => {
      if (pollTimer) return;
      dispatch({ type: "status", status: "polling" });
      pollTimer = setInterval(poll, POLL_MS);
    };
    const stopPolling = () => {
      clearInterval(pollTimer);
      pollTimer = 0;
    };

    const connect = () => {
      clearTimeout(retryTimer);
      if (stopped || (ws && ws.readyState <= WebSocket.OPEN)) return;
      const scheme = window.location.protocol === "https:" ? "wss" : "ws";
      let socket;
      try {
        socket = new WebSocket(`${scheme}://${window.location.host}/api/live/ws`);
      } catch {
        return retry();
      }
      ws = socket;
      socket.onopen = () => {
        fails = 0;
        stopPolling();
        dispatch({ type: "status", status: "live" });
        clearInterval(pingTimer);
        // A ping a while; no pong soon after means the line is dead, so start over.
        pingTimer = setInterval(() => {
          if (socket.readyState !== WebSocket.OPEN) return;
          socket.send("ping");
          clearTimeout(pongTimer);
          pongTimer = setTimeout(() => socket.close(), 10000);
        }, PING_MS);
      };
      socket.onmessage = (e) => {
        if (e.data === "pong") return clearTimeout(pongTimer);
        try {
          const msg = JSON.parse(e.data);
          dispatch(msg.type === "sync" ? { ...msg, animate: true } : msg);
        } catch {
          // Not ours.
        }
      };
      socket.onclose = () => {
        clearInterval(pingTimer);
        clearTimeout(pongTimer);
        if (ws === socket) ws = null;
        if (!stopped) retry();
      };
    };

    const retry = () => {
      fails += 1;
      dispatch({ type: "status", status: "reconnecting" });
      if (fails >= FAILS_BEFORE_POLL) startPolling();
      // 0.5s, 1s, 2s … up to 15s, with a little jitter so a room doesn't reconnect in step.
      const delay = Math.min(15000, 500 * 2 ** Math.min(fails - 1, 5)) + Math.random() * 400;
      retryTimer = setTimeout(connect, delay);
    };

    // Back on the tab, or back online: try at once instead of waiting out the backoff.
    const wake = () => {
      if (document.visibilityState === "visible" && !ws) connect();
    };

    poll(false);
    connect();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      clearInterval(pingTimer);
      clearTimeout(pongTimer);
      stopPolling();
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      ws?.close();
    };
  }, []);

  // Applies a change this page made itself (the server's answer), without waiting
  // for the broadcast, which also covers polling mode. Repeats are ignored.
  const apply = useCallback((msg) => dispatch(msg), []);
  const refresh = useCallback(() => pollNow.current(), []);

  return { ...state, apply, refresh };
}
