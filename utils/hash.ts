import bcrypt from "bcrypt";
import { authConfig } from "../config/auth";

export async function hashPassword(plain: string): Promise<string> {
  const saltRounds = authConfig.bcryptSaltRounds;
  return bcrypt.hash(plain, saltRounds);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}


