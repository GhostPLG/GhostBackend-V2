import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../../bootstrap/env";
import { UserRepository } from "../../../infrastructure/persistence/UserRepository";
import { epicError } from "./error";

export interface AuthenticatedRequest extends Request {
  account?: { accountId: string; displayName: string };
}

const users = new UserRepository();

/** Aceita "bearer eg1~xxx", "Bearer eg1~xxx", "bearer xxx" — case-insensitive */
const extractToken = (header?: string): string | null => {
  if (!header) return null;
  const m = /^bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return null;
  return m[1].replace(/^eg1~/i, "").trim();
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractToken(req.headers.authorization);

  if (!token) {
    console.log(`[auth] SEM TOKEN | ${req.method} ${req.originalUrl}`);
    return epicError(
      res,
      401,
      "errors.com.epicgames.common.authorization.authorization_failed",
      `Authorization failed for ${req.originalUrl}`,
      1032
    );
  }

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
    console.log(`[auth] OK | ${req.method} ${req.originalUrl} | acc=${user.accountId}`);
    next();
  } catch (e) {
    console.log(
      `[auth] FALHOU | ${req.method} ${req.originalUrl} | ${(e as Error).message}`
    );
    return epicError(
      res,
      401,
      "errors.com.epicgames.common.authorization.authorization_failed",
      `Authorization failed for ${req.originalUrl}`,
      1032
    );
  }
};