import { Router } from "express";
import crypto from "crypto";

export const cloudstorageRouter = Router();

/**
 * Enumeração de arquivos do sistema. A 6.31 chama antes do lobby
 * para hotfix. Lista vazia é aceita — evita o erro de enumeração.
 */
cloudstorageRouter.get(
  "/fortnite/api/cloudstorage/system",
  (_req, res) => {
    res.json([]);
  }
);

cloudstorageRouter.get(
  "/fortnite/api/cloudstorage/system/:filename",
  (req, res) => {
    const content = ""; // arquivo vazio é aceito no boot
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Length",
      String(Buffer.byteLength(content))
    );
    res.send(content);
  }
);

cloudstorageRouter.get(
  "/fortnite/api/cloudstorage/user/:accountId",
  (_req, res) => {
    res.json([]);
  }
);

cloudstorageRouter.get(
  "/fortnite/api/cloudstorage/user/:accountId/:filename",
  (_req, res) => {
    res.status(404).end();
  }
);