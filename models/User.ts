export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: "admin" | "user";
  is_active: boolean;
  verified: boolean;
  email_verified: boolean;
  token_version: number;
  wallet_id: string | null;
  rating: number | null;
  bio?: string | null;
  last_login: Date | null;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface NewUser {
  email: string;
  username: string;
  password_hash: string;
  role?: "admin" | "user";
}

export const USERS_TABLE = "users";