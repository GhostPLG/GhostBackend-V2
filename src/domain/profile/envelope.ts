import { Profile, ProfileChange } from "./Profile";

export interface ProfileEnvelope {
  profileRevision: number;
  profileId: string;
  profileChangesBaseRevision: number;
  profileChanges: ProfileChange[];
  profileCommandRevision: number;
  serverTime: string;
  responseVersion: number;
  multiUpdate?: Array<{
    profileRevision: number;
    profileId: string;
    profileChangesBaseRevision: number;
    profileChanges: ProfileChange[];
    profileCommandRevision: number;
  }>;
}

export const fullProfileUpdate = (profile: Profile): ProfileEnvelope => ({
  profileRevision: profile.rvn,
  profileId: profile.profileId,
  profileChangesBaseRevision: profile.rvn,
  profileChanges: [
    {
      changeType: "fullProfileUpdate",
      profile,
    },
  ],
  profileCommandRevision: profile.commandRevision,
  serverTime: new Date().toISOString(),
  responseVersion: 1,
});

export const deltaUpdate = (
  profile: Profile,
  baseRevision: number,
  changes: ProfileChange[]
): ProfileEnvelope => ({
  profileRevision: profile.rvn,
  profileId: profile.profileId,
  profileChangesBaseRevision: baseRevision,
  profileChanges: changes,
  profileCommandRevision: profile.commandRevision,
  serverTime: new Date().toISOString(),
  responseVersion: 1,
});