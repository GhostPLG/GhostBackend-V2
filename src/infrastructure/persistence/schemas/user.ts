import { Schema, model } from "mongoose";

export interface UserDocument {
  accountId: string;
  displayName: string;
  email: string;
  passwordHash: string;
  banned: boolean;
  createdAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    accountId: { type: String, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    banned: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => new Date() },
  },
  { collection: "users" }
);

export const UserModel = model<UserDocument>("User", userSchema);