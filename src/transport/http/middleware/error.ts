import { Request, Response, NextFunction } from "express";

export interface EpicErrorBody {
  errorCode: string;
  errorMessage: string;
  messageVars: unknown[];
  numericErrorCode: number;
  originatingService: string;
  intent: string;
  error_description?: string;
  error?: string;
}

export const epicError = (
  res: Response,
  status: number,
  errorCode: string,
  message: string,
  numericErrorCode: number,
  intent = "prod"
): void => {
  res.status(status);
  res.setHeader("X-Epic-Error-Name", errorCode);
  res.setHeader("X-Epic-Error-Code", String(numericErrorCode));
  const body: EpicErrorBody = {
    errorCode,
    errorMessage: message,
    messageVars: [],
    numericErrorCode,
    originatingService: "any",
    intent,
  };
  res.json(body);
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  epicError(
    res,
    404,
    "errors.com.epicgames.common.not_found",
    `Sorry the resource "${req.originalUrl}" you were trying to find could not be found`,
    1004
  );
};