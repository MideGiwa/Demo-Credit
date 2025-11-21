export interface Wallet {
  id: string;
  user_id: string;
  available_balance: number;
  ledger_balance: number;
  loan_balance: number;
  currency: string;
  status: "active" | "frozen" | "closed";
  created_at: Date;
  updated_at: Date;
}

export interface NewWallet {
  user_id: string;
  currency: string;
}

export const WALLETS_TABLE = "wallets";

