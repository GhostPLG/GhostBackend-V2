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
    const seeded = seedProfile(accountId, profileId);
    const toSave: Profile = {
      ...seeded,
      rvn: 1,
      commandRevision: 1,
    };
    const saved = await profiles.save(toSave);
    if (saved) profile = saved;
    else profile = toSave;
  }

  return { profile, profileId };
};

mcpRouter.post(
  "/fortnite/api/game/v2/profile/:accountId/client/QueryProfile",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const t0 = performance.now();
    const ctx = await resolveProfile(req, res);
    const t1 = performance.now();

    if (!ctx) return;

    res.json(fullProfileUpdate(ctx.profile));

    console.log(
      `[query] load=${(t1 - t0).toFixed(1)}ms | itens=${Object.keys(ctx.profile.items).length}`
    );
  }
);

mcpRouter.post(
  "/fortnite/api/game/v2/profile/:accountId/client/EquipBattleRoyaleCustomization",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const t0 = performance.now();
    const ctx = await resolveProfile(req, res);
    const t1 = performance.now();

    if (!ctx) return;

    const result = equipBattleRoyaleCustomization(ctx.profile, req.body);
    const t2 = performance.now();

    if (!result.changedItemId) {
      return res.json(deltaUpdate(ctx.profile, ctx.profile.rvn, []));
    }

    const saved = await profiles.saveIfRevision(
      result.changedProfile,
      ctx.profile.rvn
    );
    const t3 = performance.now();

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

    console.log(
      `[equip] slot=${req.body?.slotName} load=${(t1 - t0).toFixed(1)}ms clone=${(t2 - t1).toFixed(1)}ms save=${(t3 - t2).toFixed(1)}ms | total=${(t3 - t0).toFixed(1)}ms`
    );
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
  "/fortnite/api/game/v2/profile/:accountId/:other/:command",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const ctx = await resolveProfile(req, res);
    if (!ctx) return;
    res.json(fullProfileUpdate(ctx.profile));
  }
);