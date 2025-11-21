import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { UnauthorizedError, ForbiddenError } from "../errors/HttpError";

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing authorization header"));
  }

  const token = authHeader.substring("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      token_version: payload.token_version,
    };
    return next();
  } catch {
    return next(new UnauthorizedError("Invalid or expired token"));
  }
}

export function requireUser(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new UnauthorizedError("Authentication required"));
  }
  return next();
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next(new UnauthorizedError("Authentication required"));
  }
  if (req.user.role !== "admin") {
    return next(new ForbiddenError("Admin access required"));
  }
  return next();
}


