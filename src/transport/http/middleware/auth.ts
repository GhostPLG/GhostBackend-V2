import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../../bootstrap/env";
import { UserRepository } from "../../../infrastructure/persistence/UserRepository";
import { epicError } from "./error";

export interface AuthenticatedRequest extends Request {
  account?: { accountId: string; displayName: string };
}

const users = new UserRepository();

/**
 * Verificação REAL: aqui usamos jwt.verify, não jwt.decode.
 * É a diferença central em relação ao Lawin, Better-Reload e V2.
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith("bearer eg1~")) {
    return epicError(
      res,
      401,
      "errors.com.epicgames.common.authorization.authorization_failed",
      `Authorization failed for ${req.originalUrl}`,
      1032
    );
  }

  const token = header.replace(/^bearer eg1~/i, "");

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string; dn: string };
    const user = await users.findByAccountId(payload.sub);

    if (!user) throw new Error("usuário inexistente");
    if (user.banned) {
      return epicError(
        res,
        400,
        "errors.com.epicgames.account.account_not_active",
        "You have been permanently banned from Fortnite.",
        -1
      );
    }

    req.account = { accountId: user.accountId, displayName: user.displayName };
    next();
  } catch {
    return epicError(
      res,
      401,
      "errors.com.epicgames.common.authorization.authorization_failed",
      `Authorization failed for ${req.originalUrl}`,
      1032
    );
  }
};