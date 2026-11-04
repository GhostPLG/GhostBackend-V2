import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";

export const gameRouter = Router();

/**
 * Bloqueador do login na 6.31.
 * Sem este endpoint o cliente aborta em CheckPlatformPlayAllowed
 * e nunca chega na tela de login.
 */
const playOnPlatformHandler = (_req: Request, res: Response): void => {
  res.status(200).type("text/plain").send("true");
};

gameRouter.get(
  "/fortnite/api/game/v2/tryPlayOnPlatform/account/:accountId",
  requireAuth,
  playOnPlatformHandler
);

gameRouter.post(
  "/fortnite/api/game/v2/tryPlayOnPlatform/account/:accountId",
  requireAuth,
  playOnPlatformHandler
);

/**
 * Restrições de plataforma e crossplay. A 6.31 consulta antes do lobby.
 */
gameRouter.get(
  "/fortnite/api/game/v2/enabled_features",
  (_req, res) => {
    res.json([]);
  }
);

gameRouter.get(
  "/fortnite/api/game/v2/privacy/account/:accountId",
  requireAuth,
  (req, res) => {
    res.json({
      accountId: req.params.accountId,
      optOutOfPublicLeaderboards: false,
    });
  }
);

gameRouter.post(
  "/fortnite/api/game/v2/privacy/account/:accountId",
  requireAuth,
  (req, res) => {
    res.json({
      accountId: req.params.accountId,
      optOutOfPublicLeaderboards:
        req.body?.optOutOfPublicLeaderboards ?? false,
    });
  }
);