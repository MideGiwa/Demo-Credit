import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/knex";
import { USERS_TABLE, NewUser } from "../models/User";
import { AUTH_TOKENS_TABLE, NewAuthToken } from "../models/AuthToken";
import { hashPassword, verifyPassword } from "../utils/hash";
import {
  JwtPayload,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { BadRequestError, UnauthorizedError } from "../errors/HttpError";
import { authConfig } from "../config/auth";

export async function register(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, username, password } = req.body as {
      email?: string;
      username?: string;
      password?: string;
    };

    if (!email || !username || !password) {
      throw new BadRequestError("email, username and password are required");
    }

    const existing = await db(USERS_TABLE).where({ email }).first();
    if (existing) {
      throw new BadRequestError("Email already in use");
    }

    const password_hash = await hashPassword(password);

    const newUser: NewUser = {
      email,
      username,
      password_hash,
      role: "user",
    };

    const id = uuidv4();

    await db(USERS_TABLE).insert({
      id,
      ...newUser,
      is_active: true,
      verified: false,
      email_verified: false,
      token_version: 0,
      wallet_id: null,
      rating: null,
      bio: null,
      last_login: null,
    });

    res.status(201).json({ id, email, username, role: "user" });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new BadRequestError("email and password are required");
    }

    const user = await db(USERS_TABLE).where({ email }).first();
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const passwordMatch = await verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      token_version: user.token_version,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const refreshExpires = new Date(
      Date.now() + authConfig.refreshTokenTtlSeconds * 1000
    );

    const newToken: NewAuthToken = {
      user_id: user.id,
      token: refreshToken,
      user_agent: req.headers["user-agent"] || null,
      ip_address:
        (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      expires_at: refreshExpires,
    };

    await db(AUTH_TOKENS_TABLE).insert({
      id: uuidv4(),
      ...newToken,
      revoked: false,
      created_at: new Date(),
    });

    res
      .cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: refreshExpires,
      })
      .json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      (req.cookies && req.cookies.refresh_token) || req.body.refresh_token;

    if (!token) {
      throw new UnauthorizedError("Missing refresh token");
    }

    const stored = await db(AUTH_TOKENS_TABLE).where({ token }).first();
    if (!stored || stored.revoked) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const payload = verifyRefreshToken(token);

    const user = await db(USERS_TABLE).where({ id: payload.id }).first();
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    if (user.token_version !== payload.token_version) {
      throw new UnauthorizedError("Token has been revoked");
    }

    const newPayload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      token_version: user.token_version,
    };

    const accessToken = signAccessToken(newPayload);

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      (req.cookies && req.cookies.refresh_token) || req.body.refresh_token;

    if (token) {
      await db(AUTH_TOKENS_TABLE).where({ token }).update({ revoked: true });
    }

    res.clearCookie("refresh_token").status(204).send();
  } catch (err) {
    next(err);
  }
}


