import http from "http";
import { WebSocketServer } from "ws";
import { handleMatchmaker } from "./matchmaker";

/**
 * Um único WebSocketServer na porta do HTTP.
 * O protocolo do cliente 6.31 é JSON no matchmaker.
 * XMPP fica para a Fase 3 — sem ele o lobby abre, mas presença/party não.
 */
export const attachWebSocket = (server: http.Server): void => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const protocol = req.headers["sec-websocket-protocol"];

    if (protocol === "xmpp") {
      // Fase 3
      ws.close(1000, "xmpp not implemented yet");
      return;
    }

    handleMatchmaker(ws);
  });

  console.log("[ws] servidor WebSocket anexado");
};