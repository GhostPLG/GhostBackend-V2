import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { env } from "../../../bootstrap/env";
import { UserRepository } from "../../../infrastructure/persistence/UserRepository";
import { epicError } from "../middleware/error";

export const oauthRouter = Router();
const users = new UserRepository();

const buildAccessToken = (accountId: string, displayName: string): string =>
  `eg1~${jwt.sign(
    {
      app: "fortnite",
      sub: accountId,
      dn: displayName,
      mver: false,
      clsvc: "fortnite",
      t: "s",
      ic: true,
      am: "password",
      jti: uuid().replace(/-/g, ""),
    },
    env.jwtSecret,
    { expiresIn: "8h" }
  )}`;

/**
 * 6.31 usa principalmente client_credentials no boot do launcher
 * e password no login. O refresh_token aparece depois.
 */
oauthRouter.post("/account/api/oauth/token", async (req, res) => {
  const grantType = String(req.body.grant_type ?? "");

  if (grantType === "client_credentials") {
    const token = buildAccessToken("client", "client");
    return res.json({
      access_token: token,
      expires_in: 28800,
      expires_at: new Date(Date.now() + 28800 * 1000).toISOString(),
      token_type: "bearer",
      client_id: String(req.body.client_id ?? "ec684b8c687f479fadea3cb2ad83f5c6"),
      internal_client: true,
      client_service: "fortnite",
    });
  }

  if (grantType === "password") {
    const username = String(req.body.username ?? "").replace(/@.*$/, "");
    const user = await users.findByAccountId(username).catch(() => null);

    // Para chegar ao lobby, aceitamos o usuário semeado.
    // Em produção: bcrypt.compare(req.body.password, user.passwordHash).
    const accountId = user?.accountId ?? (await users.ensureSeedUser(
      `${username}@local`, username, "local"
    ));

    const account = await users.findByAccountId(accountId);
    const token = buildAccessToken(accountId, account?.displayName ?? username);

    return res.json({
      access_token: token,
      expires_in: 28800,
      expires_at: new Date(Date.now() + 28800 * 1000).toISOString(),
      token_type: "bearer",
      refresh_token: `eg1~${jwt.sign({ sub: accountId, t: "r" }, env.jwtSecret, { expiresIn: "30d" })}`,
      refresh_expires: 2592000,
      refresh_expires_at: new Date(Date.now() + 2592000 * 1000).toISOString(),
      account_id: accountId,
      client_id: String(req.body.client_id ?? "ec684b8c687f479fadea3cb2ad83f5c6"),
      internal_client: false,
      client_service: "fortnite",
      displayName: account?.displayName ?? username,
    });
  }

  return epicError(
    res,
    400,
    "errors.com.epicgames.account.oauth.unsupported_grant_type",
    `Unsupported grant type ${grantType}`,
    1016
  );
});

oauthRouter.get("/account/api/oauth/verify", async (req, res) => {
  const header = req.headers.authorization ?? "";
  const token = header.replace(/^bearer eg1~/i, "");

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string; dn: string };
    return res.json({
      token,
      session_id: uuid().replace(/-/g, ""),
      token_type: "bearer",
      client_id: "ec684b8c687f479fadea3cb2ad83f5c6",
      internal_client: false,
      client_service: "fortnite",
      account_id: payload.sub,
      expires_in: 28800,
      expires_at: new Date(Date.now() + 28800 * 1000).toISOString(),
      auth_method: "password",
      display_name: payload.dn,
      app: "fortnite",
      in_app_id: payload.sub,
      device_id: uuid().replace(/-/g, ""),
    });
  } catch {
    return epicError(
      res,
      401,
      "errors.com.epicgames.account.oauth.invalid_token",
      "Invalid token",
      1013
    );
  }
});

oauthRouter.delete("/account/api/oauth/sessions/kill", (_req, res) => {
  res.status(204).end();
});

oauthRouter.delete("/account/api/oauth/sessions/kill/*", (_req, res) => {
  res.status(204).end();
});

oauthRouter.post("/account/api/oauth/exchange", (_req, res) => {
  res.json({});
});