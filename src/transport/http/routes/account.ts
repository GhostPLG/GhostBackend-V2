import { Router } from "express";
import { UserRepository } from "../../../infrastructure/persistence/UserRepository";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { epicError } from "../middleware/error";

export const accountRouter = Router();
const users = new UserRepository();

accountRouter.get(
  "/account/api/public/account",
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    res.json([
      {
        id: req.account!.accountId,
        displayName: req.account!.displayName,
        externalAuths: {},
      },
    ]);
  }
);

accountRouter.get(
  "/account/api/public/account/:accountId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const account = await users.findPublicAccount(req.params.accountId);
    if (!account) {
      return epicError(
        res,
        404,
        "errors.com.epicgames.account.account_not_found",
        `Sorry, we couldn't find an account for ${req.params.accountId}`,
        -1
      );
    }
    res.json({ ...account, externalAuths: {} });
  }
);

accountRouter.get(
  "/account/api/public/account/:accountId/externalAuths",
  requireAuth,
  (_req, res) => {
    res.json([]);
  }
);

accountRouter.get("/presence/api/v1/_/:accountId/settings/subscriptions", (_req, res) => {
  res.json([]);
});

accountRouter.get("/presence/api/v1/*", (_req, res) => {
  res.json([{ productId: "Fortnite", namespace: "fn", status: "ONLINE", away: false }]);
});