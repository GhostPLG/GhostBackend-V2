import WebSocket from "ws";
import { v4 as uuid } from "uuid";
import { env } from "../../bootstrap/env";

/**
 * Máquina de estados explícita.
 * O Lawin fazia isso com setTimeout solto; aqui cada transição
 * é nomeada e o estado inválido falha em vez de ser ignorado.
 */
type MatchmakerState =
  | "connecting"
  | "waiting"
  | "queued"
  | "session-assignment"
  | "play";

interface MatchSession {
  ticketId: string;
  matchId: string;
  sessionId: string;
  state: MatchmakerState;
  timer?: NodeJS.Timeout;
}

const send = (ws: WebSocket, payload: Record<string, unknown>): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

export const handleMatchmaker = (ws: WebSocket): void => {
  const session: MatchSession = {
    ticketId: uuid().replace(/-/g, ""),
    matchId: uuid().replace(/-/g, ""),
    sessionId: uuid().replace(/-/g, ""),
    state: "connecting",
  };

  const clear = (): void => {
    if (session.timer) clearTimeout(session.timer);
  };

  ws.on("close", clear);
  ws.on("error", clear);

  // 1. Connecting
  send(ws, { name: "Connecting" });

  session.timer = setTimeout(() => {
    session.state = "waiting";

    // 2. Waiting
    send(ws, {
      name: "Waiting",
      payload: {
        totalPlayers: 1,
        connectedPlayers: 1,
      },
    });

    session.timer = setTimeout(() => {
      session.state = "queued";

      // 3. Queued
      send(ws, {
        name: "Queued",
        payload: {
          ticketId: session.ticketId,
          queuedPlayers: 1,
          estimatedWaitSec: 0,
          status: {},
          state: { ticketId: session.ticketId },
        },
      });

      session.timer = setTimeout(() => {
        session.state = "session-assignment";

        // 4. SessionAssignment
        const sessionAddress = [env.gameServerIp, env.gameServerPort];
        const encoded = Buffer.from(JSON.stringify(sessionAddress)).toString("base64");

        send(ws, {
          name: "SessionAssignment",
          payload: {
            matchId: session.matchId,
          },
        });

        session.timer = setTimeout(() => {
          session.state = "play";

          // 5. Play
          send(ws, {
            name: "Play",
            payload: {
              matchId: session.matchId,
              sessionId: session.sessionId,
              joinDelaySec: 1,
              not_after: 0,
            },
          });
        }, 1000);
      }, 2000);
    }, 1000);
  }, 1000);
};