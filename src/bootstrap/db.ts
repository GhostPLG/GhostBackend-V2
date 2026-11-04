import mongoose from "mongoose";
import { env } from "./env";

export const connectDatabase = async (): Promise<void> => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log("[db] conectado ao MongoDB");
};