import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { ProfileRepository } from "../../../infrastructure/persistence/ProfileRepository";
import { isProfileId, seedProfile } from "../../../infrastructure/catalog/fortnite-6.31";
import { fullProfileUpdate, deltaUpdate } from "../../../domain/profile/envelope";
import { profileNotFound } from "../middleware/errors";
import { Profile } from "../../../domain/profile/Profile";
import { equipBattleRoyaleCustomization } from "../../../domain/profile/commands";

export const mcpRouter = Router();
const profiles = new ProfileRepository();

const resolveProfile = async (
  req: AuthenticatedRequest,
  res: any
): Promise<{ profile: Profile; profileId: string } | null> => {
  const profileId = String(req.query.profileId ?? "athena");

  if (!isProfileId(profileId)) {
    profileNotFound(res, profileId);
    return null;
  }

  const accountId = req.account!.accountId;
  let profile = await profiles.load(accountId, profileId);

  if (profile.rvn === 0) {
    profile = { ...seedProfile(accountId, profileId) };
    const saved = await profiles.saveIfRevision(profile, 0);
    if (saved) profile = saved;
  }

  return { profile, profileId };
};

mcpRouter.post(
  "/fortnite/api/game/v2/profile/:accountId/client/QueryProfile",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const ctx = await resolveProfile(req, res);
    if (!ctx) return;
    res.json(fullProfileUpdate(ctx.profile));
  }
);

mcpRouter.post(
  "/fortnite/api/game/v2/profile/:accountId/client/:command",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const ctx = await resolveProfile(req, res);
    if (!ctx) return;

    const command = req.params.command;

    if (command === "QueryProfile") {
      return res.json(fullProfileUpdate(ctx.profile));
    }

    res.json(deltaUpdate(ctx.profile, ctx.profile.rvn, []));
  }
);

mcpRouter.post(
  "/fortnite/api/game/v2/profile/:accountId/client/EquipBattleRoyaleCustomization",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const ctx = await resolveProfile(req, res);
    if (!ctx) return;

    console.log("[equip] body:", JSON.stringify(req.body));
    console.log("[equip] rvn antes:", ctx.profile.rvn);

    const result = equipBattleRoyaleCustomization(ctx.profile, req.body);
    console.log("[equip] changedItemId:", result.changedItemId);

    if (!result.changedItemId) {
      console.log("[equip] SEM LOCKER — abaortando");
      return res.json(deltaUpdate(ctx.profile, ctx.profile.rvn, []));
    }

    console.log("[equip] rvn novo:", result.changedProfile.rvn);

    const saved = await profiles.saveIfRevision(
      result.changedProfile,
      ctx.profile.rvn
    );

    console.log("[equip] saveIfRevision retornou:", saved ? "OK" : "NULL");

    const finalProfile = saved ?? result.changedProfile;

    res.json(
      deltaUpdate(finalProfile, finalProfile.rvn, [
        {
          changeType: "itemAttrChanged",
          itemId: result.changedItemId,
          attributeName: "locker_slots_data",
          attributeValue:
            finalProfile.items[result.changedItemId].attributes
              .locker_slots_data,
        },
      ])
    );
  }
);

mcpRouter.post(
  "/fortnite/api/game/v2/profile/:accountId/:other/:command",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const ctx = await resolveProfile(req, res);
    if (!ctx) return;
    res.json(fullProfileUpdate(ctx.profile));
  }
);