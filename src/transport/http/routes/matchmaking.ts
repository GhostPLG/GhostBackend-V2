import { Router } from "express";
import { env } from "../../../bootstrap/env";
import { requireAuth } from "../middleware/auth";

export const matchmakingRouter = Router();

/**
 * Ticket: anuncia o WebSocket do matchmaker.
 * Como HTTP e WS compartilham a mesma porta, o endereço anunciado
 * é o mesmo que o cliente já está usando — sem porta dupla.
 */
matchmakingRouter.get(
  "/fortnite/api/game/v2/matchmakingservice/ticket/player/:accountId",
  requireAuth,
  (req, res) => {
    const bucketId = String(req.query.bucketId ?? "0");

    res.cookie("currentbuildUniqueId", bucketId.split(":")[0]);

    res.json({
      serviceUrl: `ws://${env.publicHost}:${env.publicPort}`,
      ticketType: "mms-player",
      payload: "69=",
      signature: "420=",
    });
  }
);

matchmakingRouter.get("/fortnite/api/matchmaking/session/findPlayer/*", (_req, res) => {
  res.status(204).end();
});

matchmakingRouter.get(
  "/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId",
  (req, res) => {
    res.json({
      accountId: req.params.accountId,
      sessionId: req.params.sessionId,
      key: "AOJEv8uTFmUh7XM2328kq9rlAzeQ5xzWzPIiyKn2s7s=",
    });
  }
);

matchmakingRouter.get("/fortnite/api/matchmaking/session/:sessionId", (req, res) => {
  const now = new Date().toISOString();
  res.json({
    id: req.params.sessionId,
    ownerId: "local",
    ownerName: "[DS]fortnite-live",
    serverName: "[DS]fortnite-live",
    serverAddress: env.gameServerIp,
    serverPort: env.gameServerPort,
    maxPublicPlayers: 100,
    openPublicPlayers: 100,
    maxPrivatePlayers: 0,
    openPrivatePlayers: 0,
    attributes: {
      REGION_s: "EU",
      GAMEMODE_s: "FORTATHENA",
      ALLOWBROADCASTING_b: true,
      SUBREGION_s: "GB",
      DCID_s: "FORTNITE-LIVEEUGCEC1C2E30UBRCORE0A-14840880",
      tenant_s: "Fortnite",
      MATCHMAKINGPOOL_s: "Any",
      STORMSHIELDDEFENSETYPE_i: 0,
      HOTFIXVERSION_i: 0,
      PLAYLISTNAME_s: "Playlist_DefaultSolo",
      SESSIONKEY_s: "local",
      TENANT_s: "Fortnite",
      BEACONPORT_i: 15009,
    },
    publicPlayers: [],
    privatePlayers: [],
    totalPlayers: 0,
    allowJoinInProgress: false,
    shouldAdvertise: false,
    isDedicated: false,
    usesStats: false,
    allowInvites: false,
    usesPresence: false,
    allowJoinViaPresence: true,
    allowJoinViaPresenceFriendsOnly: false,
    buildUniqueId: req.cookies?.currentbuildUniqueId ?? "0",
    lastUpdated: now,
    started: false,
  });
});

matchmakingRouter.post("/fortnite/api/matchmaking/session/:sessionId/join", (_req, res) => {
  res.status(204).end();
});

matchmakingRouter.post("/fortnite/api/matchmaking/session/matchMakingRequest", (_req, res) => {
  res.json([]);
});