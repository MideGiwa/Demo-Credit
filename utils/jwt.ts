import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth";

export interface JwtPayload {
  id: string;
  email: string;
  role: "admin" | "user";
  token_version: number;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, authConfig.jwtAccessSecret, {
    expiresIn: authConfig.accessTokenTtlSeconds,
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, authConfig.jwtRefreshSecret, {
    expiresIn: authConfig.refreshTokenTtlSeconds,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, authConfig.jwtAccessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, authConfig.jwtRefreshSecret) as JwtPayload;
}


