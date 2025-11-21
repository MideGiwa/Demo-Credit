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

export type RegisterPayload = {
    email?: string;
    username?: string;
    password?: string;
};

export type LoginPayload = {
    email?: string;
    password?: string;
};

export async function registerUser(payload: RegisterPayload) {
    const { email, username, password } = payload;

    if (!email || !username || !password) {
        throw new BadRequestError("email, username and password are required");
    }

    const existingEmail = await db(USERS_TABLE).where({ email }).first();
    if (existingEmail) {
        throw new BadRequestError("Email already in use");
    }

    const existingUsername = await db(USERS_TABLE).where({ username }).first();
    if (existingUsername) {
        throw new BadRequestError("Username already in use");
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

    return { id, email, username, role: "user" };
}

export async function loginUser(payload: LoginPayload, userAgent?: string, ipAddress?: string) {
    const { email, password } = payload;

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

    const jwtPayload: JwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        token_version: user.token_version,
    };

    const accessToken = signAccessToken(jwtPayload);
    const refreshToken = signRefreshToken(jwtPayload);

    const refreshExpires = new Date(
        Date.now() + authConfig.refreshTokenTtlSeconds * 1000
    );

    const newToken: NewAuthToken = {
        user_id: user.id,
        token: refreshToken,
        user_agent: userAgent || null,
        ip_address: ipAddress || null,
        expires_at: refreshExpires,
    };

    await db(AUTH_TOKENS_TABLE).insert({
        id: uuidv4(),
        ...newToken,
        revoked: false,
        created_at: new Date(),
    });

    return { accessToken, refreshToken, refreshExpires };
}

export async function refreshUserToken(token?: string) {
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

    return { accessToken };
}

export async function revokeUserToken(token?: string) {
    if (token) {
        await db(AUTH_TOKENS_TABLE).where({ token }).update({ revoked: true });
    }
}
