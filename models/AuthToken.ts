export interface AuthToken {
  id: string;
  user_id: string;
  token: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: Date;
  revoked: boolean;
  created_at: Date;
}

export interface NewAuthToken {
  user_id: string;
  token: string;
  user_agent?: string | null;
  ip_address?: string | null;
  expires_at: Date;
}

export const AUTH_TOKENS_TABLE = "auth_tokens";


