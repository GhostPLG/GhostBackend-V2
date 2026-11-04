import { Profile, emptyProfile, bumpRevision } from "../../domain/profile/Profile";
import { ProfileModel } from "./schemas/profile";

/**
 * Fonte de verdade única: o MongoDB.
 * Nada de require() cacheando objeto nem variável de módulo com estado.
 */
export class ProfileRepository {
  async load(accountId: string, profileId: string): Promise<Profile> {
    const doc = await ProfileModel.findOne({ accountId, profileId }).lean();
    if (doc) return doc.data as unknown as Profile;

    const created = emptyProfile(accountId, profileId);
    await ProfileModel.create({
      accountId,
      profileId,
      rev: 0,
      data: created as unknown as Record<string, unknown>,
    });
    return created;
  }

  /**
   * Update condicional por revisão (CAS).
   * Se a revisão esperada não bater, retorna null — o chamador decide
   * se re-tenta ou devolve conflito. Isso impede lost update em compras.
   */
  async saveIfRevision(
    profile: Profile,
    expectedRevision: number
  ): Promise<Profile | null> {
    const next: Profile = { ...profile };
    bumpRevision(next);

    const result = await ProfileModel.findOneAndUpdate(
      {
        accountId: next.accountId,
        profileId: next.profileId,
        rev: expectedRevision,
      },
      { $set: { data: next as unknown as Record<string, unknown>, rev: next.rvn } },
      { new: true }
    ).lean();

    if (!result) return null;
    return result.data as unknown as Profile;
  }
}