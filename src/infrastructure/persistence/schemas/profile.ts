import { Schema, model } from "mongoose";

export interface ProfileDocument {
  accountId: string;
  profileId: string;
  rev: number;
  data: Record<string, unknown>;
}

const profileSchema = new Schema<ProfileDocument>(
  {
    accountId: { type: String, required: true, index: true },
    profileId: { type: String, required: true, index: true },
    rev: { type: Number, default: 0 },
    data: { type: Object, required: true },
  },
  { collection: "profiles" }
);

// Um perfil por conta+profileId. O índice garante o invariante no banco,
// não apenas no código.
profileSchema.index({ accountId: 1, profileId: 1 }, { unique: true });

export const ProfileModel = model<ProfileDocument>("Profile", profileSchema);