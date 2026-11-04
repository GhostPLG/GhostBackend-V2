import { Response } from "express";
import { epicError } from "./error";

export const profileNotFound = (res: Response, profileId: string): void => {
  epicError(
    res,
    404,
    "errors.com.epicgames.modules.profiles.undefined_profile",
    `Profile not defined. (profileId: ${profileId})`,
    16208
  );
};