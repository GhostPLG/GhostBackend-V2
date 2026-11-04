import express from "express";
import cookieParser from "cookie-parser";
import http from "http";
import { env } from "./env";
import { connectDatabase } from "./db";
import { notFoundHandler } from "../transport/http/middleware/error";
import { oauthRouter } from "../transport/http/routes/oauth";
import { accountRouter } from "../transport/http/routes/account";
import { contentRouter } from "../transport/http/routes/content";
import { mcpRouter } from "../transport/http/routes/mcp";
import { matchmakingRouter } from "../transport/http/routes/matchmaking";
import { attachWebSocket } from "../transport/ws";
import { gameRouter } from "../transport/http/routes/game";
import { cloudstorageRouter } from "../transport/http/routes/cloudstorage";
import { PROFILE_IDS } from "../infrastructure/catalog/fortnite-6.31";
import { profileLoader } from "../infrastructure/catalog/ProfileLoader";

const app = express();

app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(oauthRouter);
app.use(accountRouter);
app.use(contentRouter);
app.use(gameRouter);
app.use(cloudstorageRouter);
app.use(mcpRouter);
app.use(matchmakingRouter);

app.use(notFoundHandler);

const server = http.createServer(app);

// WebSocket na MESMA porta do HTTP: resolve o problema de porta dupla
// e funciona com a DLL do launcher apontando tudo para 127.0.0.1:3551.
attachWebSocket(server);

const bootstrap = async (): Promise<void> => {
  await connectDatabase();

  profileLoader.load();

  const missing = PROFILE_IDS.filter((id) => !profileLoader.has(id));
  if (missing.length > 0) {
    console.warn(`[catalog] perfis ausentes: ${missing.join(", ")}`);
  }

  server.listen(env.port, () => {
    console.log(`[http] escutando em http://${env.publicHost}:${env.port}`);
    console.log(`[ws]   matchmaking em ws://${env.publicHost}:${env.port}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[fatal] porta ${env.port} já está em uso`);
      process.exit(1);
    }
    throw err;
  });
};

process.on("uncaughtException", (err) => {
  console.error("[fatal] exceção não capturada:", err.message);
});

bootstrap().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});