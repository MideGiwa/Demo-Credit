export type WalletTransactionType =
  | "FUND"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "WITHDRAW"
  | "LOAN_DISBURSE"
  | "LOAN_REPAY";

export type WalletTransactionStatus = "pending" | "completed" | "failed";

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  type: WalletTransactionType;
  amount: number;
  currency: string;
  status: WalletTransactionStatus;
  reference: string;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface NewWalletTransaction {
  wallet_id: string;
  type: WalletTransactionType;
  amount: number;
  currency: string;
  status: WalletTransactionStatus;
  reference: string;
  metadata?: Record<string, any> | null;
}

export const WALLET_TRANSACTIONS_TABLE = "wallet_transactions";


