import WebSocket from "ws";
import { v4 as uuid } from "uuid";
import { env } from "../../bootstrap/env";
import { registerSession } from "../http/routes/matchmaking";

interface MatchSession {
  ticketId: string;
  matchId: string;
  sessionId: string;
  accountId: string;
  playlist: string;
  region: string;
  timer?: NodeJS.Timeout;
  started: boolean;
}

/** Envia no formato que o 6.31 espera: name + payload.state */
const send = (ws: WebSocket, name: string, payload: Record<string, unknown>): void => {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ name, payload }));
  console.log(`[mm] → ${name} ${JSON.stringify(payload).slice(0, 140)}`);
};

export const handleMatchmaker = (
  ws: WebSocket,
  accountId = "unknown",
  playlist = "playlist_defaultsolo",
  region = "NAE"
): void => {
  const session: MatchSession = {
    ticketId: uuid().replace(/-/g, ""),
    matchId: uuid().replace(/-/g, ""),
    sessionId: uuid().replace(/-/g, ""),
    accountId,
    playlist,
    region,
    started: false,
  };

  console.log(`[mm] nova conexão | account=${accountId} | ${playlist} | ${region}`);

  // ---------- ENTRADA ----------
  ws.on("message", (raw) => {
    const text = raw.toString();
    console.log("[mm] ← RAW:", text.slice(0, 300));

    let msg: any;
    try {
      msg = JSON.parse(text);
    } catch {
      console.log("[mm] ← não-JSON, ignorando");
      return;
    }

    // ping/pong mantém a conexão viva
    if (msg.name === "ping" || msg.name === "Ping") {
      send(ws, "pong", {});
      return;
    }

    if (msg.name === "hello") {
      send(ws, "hello", {
        clientType: "Fortnite",
        ...(msg.payload ?? {}),
      });
      start(ws, session);
      return;
    }

    if (msg.name === "Play") {
      start(ws, session);
      return;
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`[mm] cliente desconectou | code=${code} | reason=${reason.toString()}`);
    if (session.timer) clearTimeout(session.timer);
  });

  ws.on("error", (err) => {
    console.log("[mm] erro no socket:", err.message);
    if (session.timer) clearTimeout(session.timer);
  });

  // fallback: alguns clientes não mandam hello — inicia após 800ms
  setTimeout(() => {
    if (!session.started && ws.readyState === WebSocket.OPEN) {
      console.log("[mm] hello não recebido — iniciando fila mesmo assim");
      start(ws, session);
    }
  }, 800);
};

// ---------- FILA ----------
const start = (ws: WebSocket, s: MatchSession): void => {
  // guarda contra duplo start (evita Play duplicado)
  if (s.started) return;
  s.started = true;

  send(ws, "StatusUpdate", { state: "Connecting" });

  s.timer = setTimeout(() => {
    send(ws, "StatusUpdate", {
      state: "Waiting",
      totalPlayers: 1,
      connectedPlayers: 1,
    });

    s.timer = setTimeout(() => {
      send(ws, "StatusUpdate", {
        state: "Queued",
        ticketId: s.ticketId,
        queuedPlayers: 1,
        estimatedWaitSec: 0,
      });

      s.timer = setTimeout(() => {
        send(ws, "StatusUpdate", {
          state: "SessionAssignment",
          matchId: s.matchId,
        });

        s.timer = setTimeout(() => {
          // CRÍTICO: registra a sessão ANTES de mandar o Play.
          // Sem isso o cliente pede /matchmaking/session/:id e recebe 404,
          // o que ele interpreta como "session expired".
          const sessionPayload = {
            id: s.sessionId,
            ownerId: s.accountId,
            ownerName: "Player",
            serverName: `Ghost ${s.playlist}`,
            serverAddress: env.gameServerIp,
            serverPort: env.gameServerPort,
            playlist: s.playlist,
            region: s.region,
            maxPublicPlayers: 100,
            openPublicPlayers: 99,
            maxPrivatePlayers: 0,
            openPrivatePlayers: 0,
            allowJoinInProgress: false,
            shouldAdvertise: false,
            isDedicated: true,
            useCertificateAuth: false,
            allowCrossPlatformPlay: true,
            numPublicConnections: 100,
            numOpenPublicConnections: 99,
            numPrivateConnections: 0,
            numOpenPrivateConnections: 0,
            started: false,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7200_000).toISOString(),
            players: [
              {
                accountId: s.accountId,
                displayName: "Player",
                ticketId: s.ticketId,
              },
            ],
          };

          registerSession(sessionPayload);
          console.log(`[mm] sessão registrada: ${s.sessionId}`);

          send(ws, "Play", {
            matchId: s.matchId,
            sessionId: s.sessionId,
            joinDelaySec: 1,
          });
        }, 2000);
      }, 4000);
    }, 1000);
  }, 800);
};