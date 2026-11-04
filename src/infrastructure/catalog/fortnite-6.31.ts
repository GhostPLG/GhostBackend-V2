import { Profile } from "../../domain/profile/Profile";
import { profileLoader } from "./ProfileLoader";

export const PROFILE_IDS = [
  "athena",
  "common_core",
  "common_public",
  "campaign",
  "creative",
  "metadata",
  "profile0",
  "theater0",
  "collections",
  "collection_book_people0",
  "collection_book_schematics0",
  "outpost0",
] as const;

export type ProfileId = (typeof PROFILE_IDS)[number];

export const isProfileId = (value: string): value is ProfileId =>
  profileLoader.has(value);

/**
 * Não há mais campos inventados aqui.
 * O conteúdo vem do JSON, que é o formato que o cliente 6.31 aceita.
 */
export const seedProfile = (accountId: string, profileId: ProfileId): Profile =>
  profileLoader.instantiate(profileId, accountId);