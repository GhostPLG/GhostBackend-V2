import { Router } from "express";
import { resolveAdapter } from "../../../domain/build/adapter";

export const contentRouter = Router();

// Lightswitch: o cliente pergunta quais serviços estão de pé.
contentRouter.get("/lightswitch/api/service/bulk/status", (_req, res) => {
  res.json([
    {
      serviceInstanceId: "fortnite",
      status: "UP",
      message: "fortnite is up.",
      maintenanceUri: null,
      overrideCatalogIds: ["a7f138b2e51945ffbfdacc1af0541053"],
      allowedActions: ["PLAY", "DOWNLOAD"],
      banned: false,
      launcherInfoDTO: {
        appName: "Fortnite",
        catalogItemId: "4fe75bbc5a674f4f9b356b5c90567da5",
        namespace: "fn",
      },
    },
  ]);
});

contentRouter.get("/lightswitch/api/service/Fortnite/status", (_req, res) => {
  res.json({
    serviceInstanceId: "fortnite",
    status: "UP",
    message: "fortnite is up.",
    maintenanceUri: null,
    allowedActions: ["PLAY", "DOWNLOAD"],
    banned: false,
  });
});

// Version check — 6.31 espera "NO_UPDATE" para não tentar atualizar.
contentRouter.get("/fortnite/api/version", (req, res) => {
  resolveAdapter(req.headers["user-agent"]);
  res.json({ app: "fortnite", serverDate: new Date().toISOString(), buildUniqueId: "0" });
});

contentRouter.get("/fortnite/api/versioncheck/*", (_req, res) => {
  res.json({
    type: "NO_UPDATE",
    app: "fortnite",
    serverDate: new Date().toISOString(),
  });
});

contentRouter.get("/fortnite/api/v2/versioncheck/:platform", (_req, res) => {
  res.json({ type: "NO_UPDATE" });
});

contentRouter.get("/fortnite/api/versioncheck/:platform", (_req, res) => {
  res.json({ type: "NO_UPDATE" });
});

contentRouter.get("/fortnite/api/receipts/v1/account/:accountId/receipts", (_req, res) => {
  res.json([]);
});

contentRouter.get("/fortnite/api/game/v2/creative/discovery/surface/*", (_req, res) => {
  res.json({ panels: [] });
});

contentRouter.post("/fortnite/api/game/v2/creative/discovery/surface/*", (_req, res) => {
  res.json({ panels: [] });
});

// Timeline — o lobby consulta para montar o calendário de eventos.
contentRouter.get("/fortnite/api/calendar/v1/timeline", (_req, res) => {
  const now = new Date();
  const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  res.json({
    channels: {
      "client-events": {
        states: [
          {
            validFrom: now.toISOString(),
            activeEvents: [],
            state: {
              activeStorefronts: [],
              eventNamedWeights: {},
              seasonNumber: 6,
              seasonTemplateId: "AthenaSeason:athenaseason6",
              matchXpBonusPoints: 0,
              seasonBegin: now.toISOString(),
              seasonEnd: end.toISOString(),
              seasonDisplayedEnd: end.toISOString(),
              weeklyStoreEnd: end.toISOString(),
              stwEventStoreEnd: end.toISOString(),
              stwWeeklyStoreEnd: end.toISOString(),
              sectionStoreEnds: {},
              dailyStoreEnd: end.toISOString(),
            },
          },
        ],
        cacheExpire: end.toISOString(),
      },
    },
    cacheExpire: end.toISOString(),
    eventsTimeOffsetHrs: 0,
    currentTime: now.toISOString(),
  });
});

contentRouter.get("/fortnite/contentpages/*", (_req, res) => {
  res.json({
    _title: "Fortnite",
    _locale: "en",
    _noIndex: false,
    _activeDate: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    subgames: [],
    battlepass: { _type: "BattlePass", track: [] },
  });
});

contentRouter.get("/fortnite/api/storefront/v2/catalog", (_req, res) => {
  res.json({
    refreshIntervalHrs: 24,
    dailyPurchaseHrs: 24,
    expiration: new Date(Date.now() + 86400000).toISOString(),
    storefronts: [],
  });
});

contentRouter.get("/fortnite/api/storefront/v2/keychain", (_req, res) => {
  res.json(["STW_Announcement", "BattleBreaks", "SaveTheWorldGeneral", "BRDrop"]);
});

contentRouter.get("/affiliate/api/public/affiliates/slug/:slug", (req, res) => {
  res.json({
    id: "0",
    slug: req.params.slug,
    displayName: req.params.slug,
    status: "ACTIVE",
    verified: false,
  });
});