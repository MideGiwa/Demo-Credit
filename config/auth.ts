import dotenv from "dotenv";

dotenv.config();

export const authConfig = {
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900), // 15 minutes
  refreshTokenTtlSeconds: Number(
    process.env.REFRESH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 7
  ), // 7 days
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  adjutorApiKey: process.env.ADJUTOR_API_KEY,
};


