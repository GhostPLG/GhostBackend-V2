export interface ProfileItem {
  templateId: string;
  attributes: Record<string, unknown>;
  quantity: number;
}

export interface Profile {
  accountId: string;
  profileId: string;
  rvn: number;
  commandRevision: number;
  items: Record<string, ProfileItem>;
  stats: { attributes: Record<string, unknown> };
  createdAt: string;
  updatedAt: string;
}

export interface ProfileChange {
  changeType: string;
  [key: string]: unknown;
}

export const bumpRevision = (profile: Profile): void => {
  profile.rvn += 1;
  profile.commandRevision = profile.rvn;
  profile.updatedAt = new Date().toISOString();
};

export const emptyProfile = (accountId: string, profileId: string): Profile => ({
  accountId,
  profileId,
  rvn: 0,
  commandRevision: 0,
  items: {},
  stats: { attributes: {} },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});