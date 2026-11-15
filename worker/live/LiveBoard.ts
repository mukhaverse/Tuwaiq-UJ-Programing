// The LiveBoard Durable Object: holds every open live board's WebSocket and passes
// changes on to all of them. One instance for the site ("board"). D1 stays the record:
// routes save first, then call broadcast(); a board that connects (or reconnects) is
// sent the whole board from D1, so nothing depends on what this object remembers.
// Hibernation API: idle sockets don't keep the object running.
import { DurableObject } from "cloudflare:workers";
import { loadBoard } from "./board";

export class LiveBoard extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Keep-alive pings are answered without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    // Accepted before the board is read, so a change saved meanwhile still reaches it
    // (the board then arrives with it included; the page ignores the repeat).
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ type: "sync", ...(await loadBoard(this.env)) }));
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Sends a message (already JSON) to every open board. */
  broadcast(message: string) {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(message);
      } catch {
        // Closing or closed: its page reconnects and is sent the whole board.
      }
    }
  }

  // Boards only send "sync" (resend everything), when they think they missed something.
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (message === "sync") ws.send(JSON.stringify({ type: "sync", ...(await loadBoard(this.env)) }));
  }

  webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, "bye");
    } catch {
      // Already closed.
    }
  }
}
