import { Router } from "express";
import { v4 as uuid } from "uuid";
import { createHmac } from "crypto";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { env } from "../../../bootstrap/env";

export const matchmakingRouter = Router();

// ---------------------------------------------------------------------------
// Estado em memória
// ---------------------------------------------------------------------------
interface TicketRecord {
  accountId: string;
  bucketId: string;
  region: string;
  playlist: string;
  createdAt: number;
}

const TICKETS = new Map<string, TicketRecord>();
const SESSIONS = new Map<string, Record<string, any>>();

// liga accountId -> último ticket/playlist, para o WS recuperar contexto
const LAST_CONTEXT = new Map<string, { playlist: string; region: string }>();

const signTicket = (ticketId: string, accountId: string): string => {
  const payload = Buffer.from(
    JSON.stringify({ tid: ticketId, sub: accountId, exp: Date.now() + 3600_000 })
  ).toString("base64url");
  const signature = createHmac("sha256", env.jwtSecret)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
};

/** Normaliza o nome da playlist para o formato interno do Unreal */
const normalizePlaylist = (p?: string): string => {
  if (!p) return "Playlist_DefaultSolo";
  const map: Record<string, string> = {
    playlist_defaultsolo: "Playlist_DefaultSolo",
    playlist_defaultduo: "Playlist_DefaultDuo",
    playlist_defaultsquad: "Playlist_DefaultSquad",
  };
  return map[p] ?? p;
};

/** Retorna o accountId do ticket mais recente — o cliente não manda id no WS */
export const getMostRecentAccountId = (): string | undefined => {
  let best: { accountId: string; createdAt: number } | undefined;
  for (const t of TICKETS.values()) {
    if (!best || t.createdAt > best.createdAt) best = t;
  }
  return best?.accountId;
};

// ---------------------------------------------------------------------------
// Exports usados pelo matchmaker.ts
// ---------------------------------------------------------------------------
export const registerSession = (session: Record<string, any>): void => {
  SESSIONS.set(session.id, session);
  console.log(`[mm] registerSession ${session.id} | total=${SESSIONS.size}`);
};

export const getLastContext = (accountId: string) => LAST_CONTEXT.get(accountId);

// ---------------------------------------------------------------------------
// 1. Ticket de matchmaking — primeiro passo do fluxo no 6.31
// ---------------------------------------------------------------------------
matchmakingRouter.get(
  "/fortnite/api/game/v2/matchmakingservice/ticket/player/:accountId",
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    const accountId = req.params.accountId;
    const bucketId = String(req.query.bucketId ?? "0:0:NAE:playlist_defaultsolo");

    // grava o build id — o /session/:id vai ler daqui
    res.cookie("currentbuildUniqueId", bucketId.split(":")[0]);

    const parts = bucketId.split(":");
    const region = parts[2] || "NAE";
    const playlist = parts[3] || "playlist_defaultsolo";

    const ticketId = uuid().replace(/-/g, "");
    TICKETS.set(ticketId, {
      accountId,
      bucketId,
      region,
      playlist,
      createdAt: Date.now(),
    });
    LAST_CONTEXT.set(accountId, { playlist, region });

    // serviceUrl SEM caminho — o cliente monta o path sozinho
    const serviceUrl = `ws://${env.publicHost}:${env.publicPort}`;

    const payloadObj = {
      bucketId,
      region,
      playlist,
      accountId,
      ticketId,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };

    console.log(
      `[mm] ticket ${ticketId} | ${playlist} | ${region} | ${serviceUrl}`
    );

    res.json({
      serviceUrl,
      ticketType: "MINI",
      ticketId,
      payload: payloadObj,
      signature: signTicket(ticketId, accountId),
    });
  }
);

// ---------------------------------------------------------------------------
// 2. findPlayer — PRECISA vir antes de /session/:sessionId
// ---------------------------------------------------------------------------
matchmakingRouter.get(
  "/fortnite/api/matchmaking/session/findPlayer/:accountId",
  (req, _res, next) => {
    console.log(`[mm] entrou findPlayer | acc=${req.params.accountId}`);
    next();
  },
  requireAuth,
  (_req: AuthenticatedRequest, res) => {
    res.status(200).end();
  }
);

// ---------------------------------------------------------------------------
// 3. Consulta de sessão — o cliente pede logo após o "Play" do WebSocket
// ---------------------------------------------------------------------------
matchmakingRouter.get(
  "/fortnite/api/matchmaking/session/:sessionId",
  (req, res, next) => {
    // o 6.31 chama essa rota sem token em alguns builds
    if (!req.headers.authorization) {
      console.log("[mm] session sem auth — seguindo sem validar");
      (req as any).account = { accountId: "unknown", displayName: "Player" };
    }
    next();
  },
  (req, res, next) => {
    if ((req as any).account) return next();
    return requireAuth(req as any, res, next);
  },
  (req: AuthenticatedRequest, res) => { /* handler */ }
);

// ---------------------------------------------------------------------------
// 4. Join na sessão — retorna 204 sem corpo (é o que o 6.31 espera)
// ---------------------------------------------------------------------------
matchmakingRouter.post(
  "/fortnite/api/matchmaking/session/:sessionId/join",
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    const s = SESSIONS.get(req.params.sessionId);

    if (!s) {
      console.log(`[mm] join em sessão inexistente: ${req.params.sessionId}`);
      return res.status(404).json({
        errorCode: "errors.com.epicgames.common.not_found",
        errorMessage: `Session ${req.params.sessionId} not found`,
        numericErrorCode: 1004,
        originatingService: "any",
        intent: "prod",
      });
    }

    console.log(
      `[mm] join aceito | session=${req.params.sessionId} | ${s.serverAddress}:${s.serverPort}`
    );
    // 6.31 espera 204 sem corpo aqui
    res.status(204).end();
  }
);

// ---------------------------------------------------------------------------
// 5. Sessão por account + sessionId — pedida após o join
// ---------------------------------------------------------------------------
matchmakingRouter.get(
  "/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId",
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    const s = SESSIONS.get(req.params.sessionId);

    if (!s) {
      console.log(
        `[mm] account/session NÃO encontrada: ${req.params.sessionId} | total=${SESSIONS.size}`
      );
      return res.status(404).json({
        errorCode: "errors.com.epicgames.common.not_found",
        errorMessage: "Match session assignment not found",
        numericErrorCode: 1004,
        originatingService: "any",
        intent: "prod",
      });
    }

    console.log(`[mm] account/session entregue: ${req.params.sessionId}`);

    res.json({
      accountId: req.params.accountId,
      sessionId: req.params.sessionId,
      key: "AOJEv8uTFmUh7XM2328kq9rlAzeQ5xzWzPIiyKn2s7s=",
      region: s.region,
      playlist: normalizePlaylist(s.playlist),
      serverAddress: s.serverAddress,
      serverPort: s.serverPort,
    });
  }
);

// ---------------------------------------------------------------------------
// 6. Chave de criptografia da sessão
// ---------------------------------------------------------------------------
matchmakingRouter.get(
  "/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId/encryption",
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    console.log(`[mm] encryption pedida: ${req.params.sessionId}`);
    res.json({
      key: "AOJEv8uTFmUh7XM2328kq9rlAzeQ5xzWzPIiyKn2s7s=",
      version: 0,
    });
  }
);