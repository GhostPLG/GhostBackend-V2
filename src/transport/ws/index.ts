import http from "http";
import { WebSocketServer } from "ws";
import { handleMatchmaker } from "./matchmaker";
import { getLastContext, getMostRecentAccountId } from "../http/routes/matchmaking";

/** Extrai query params de um req.url possivelmente malformado como "//" */
const parseQuery = (rawUrl?: string): URLSearchParams => {
  if (!rawUrl) return new URLSearchParams();
  const qIndex = rawUrl.indexOf("?");
  if (qIndex === -1) return new URLSearchParams();
  return new URLSearchParams(rawUrl.slice(qIndex + 1));
};

export const attachWebSocket = (server: http.Server): void => {
  const wss = new WebSocketServer({
    server,
    handleProtocols: (protocols) => {
      const list = Array.from(protocols);
      console.log("[ws] protocolos pedidos:", list);
      return list.includes("xmpp") ? "xmpp" : list[0] ?? false;
    },
    verifyClient: (info, done) => {
      console.log(
        "[ws] upgrade | url:", info.req.url,
        "| headers:", JSON.stringify(info.req.headers["sec-websocket-protocol"] ?? null)
      );
      done(true);
    },
  });

  wss.on("connection", (ws, req) => {
    const protocol = req.headers["sec-websocket-protocol"];
    console.log("[ws] conexão | protocol:", protocol, "| url:", req.url);

    if (protocol === "xmpp") {
      console.log("[ws] XMPP solicitado — não implementado");
      ws.close(1000, "xmpp not implemented");
      return;
    }

    // sem new URL() — o cliente manda "//" e isso quebra o parser
    const params = parseQuery(req.url);
    let accountId =
      params.get("accountId") ??
      params.get("playerId") ??
      params.get("account_id") ??
      undefined;

    // fallback: único ticket pendente recente
    if (!accountId) {
      accountId = getMostRecentAccountId();
    }

    const ctx = accountId ? getLastContext(accountId) : undefined;

    handleMatchmaker(
      ws,
      accountId ?? "unknown",
      ctx?.playlist ?? "playlist_defaultsolo",
      ctx?.region ?? "NAE"
    );
  });

  console.log("[ws] servidor WebSocket anexado");
};