import { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors/HttpError";
import { logger } from "../errors/logger";

// Centralized error-handling middleware
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  const isHttpError = err instanceof HttpError;
  const status = isHttpError ? err.statusCode : 500;

  logger.error(err.message || "Unhandled error", {
    path: req.path,
    method: req.method,
    status,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
  });

  const payload: any = {
    error: isHttpError ? err.message : "Internal server error",
  };

  if (isHttpError && err.details) {
    payload.details = err.details;
  }

  res.status(status).json(payload);
}


