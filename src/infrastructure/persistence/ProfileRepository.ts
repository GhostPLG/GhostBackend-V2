import { Profile, emptyProfile } from "../../domain/profile/Profile";
import { ProfileModel } from "./schemas/profile";

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
   * Gravação incondicional. Usada para semear um perfil novo (rev 0 → 1).
   * Não há revisão anterior para comparar, então não é CAS.
   */
  async save(profile: Profile): Promise<Profile | null> {
    const result = await ProfileModel.findOneAndUpdate(
      { accountId: profile.accountId, profileId: profile.profileId },
      {
        $set: {
          data: profile as unknown as Record<string, unknown>,
          rev: profile.rvn,
        },
      },
      { new: true, upsert: true }
    ).lean();

    if (!result) return null;
    return result.data as unknown as Profile;
  }

  /**
   * CAS por revisão. NÃO incrementa rvn — quem incrementa é o comando.
   * Se a revisão esperada não bater, retorna null.
   */
  async saveIfRevision(
    profile: Profile,
    expectedRevision: number
  ): Promise<Profile | null> {
    const result = await ProfileModel.findOneAndUpdate(
      {
        accountId: profile.accountId,
        profileId: profile.profileId,
        rev: expectedRevision,
      },
      {
        $set: {
          data: profile as unknown as Record<string, unknown>,
          rev: profile.rvn,
        },
      },
      { new: true }
    ).lean();

    if (!result) return null;
    return result.data as unknown as Profile;
  }
}