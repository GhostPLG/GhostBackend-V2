import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import { UserModel } from "./schemas/user";

export interface PublicAccount {
  id: string;
  displayName: string;
}

export class UserRepository {
  async findByAccountId(accountId: string) {
    return UserModel.findOne({ accountId }).lean();
  }

  async findPublicAccount(accountId: string): Promise<PublicAccount | null> {
    const user = await UserModel.findOne({ accountId }).lean();
    if (!user) return null;
    return { id: user.accountId, displayName: user.displayName };
  }

  async ensureSeedUser(
    email: string,
    displayName: string,
    password: string
  ): Promise<string> {
    const existing = await UserModel.findOne({ email }).lean();
    if (existing) return existing.accountId;

    const accountId = uuid().replace(/-/g, "");
    await UserModel.create({
      accountId,
      displayName,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      banned: false,
    });
    return accountId;
  }
}