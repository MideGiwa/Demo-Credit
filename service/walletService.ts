import { Knex } from "knex";
import { v4 as uuidv4 } from "uuid";
import { db } from "../config/knex";
import { WALLETS_TABLE, Wallet } from "../models/Wallet";
import {
  WALLET_TRANSACTIONS_TABLE,
  WalletTransactionType,
  WalletTransactionStatus,
} from "../models/WalletTransaction";
import { BadRequestError, ConflictError } from "../errors/HttpError";
import { assertPositiveNumber } from "../utils/validation";

const DEFAULT_CURRENCY = "NGN";

type WalletSnapshot = {
  id: string;
  available_balance: number;
  ledger_balance: number;
  loan_balance: number;
  currency: string;
};

type FundOptions = {
  userId: string;
  amount: number;
  currency?: string;
  reference?: string;
  metadata?: Record<string, any>;
  treatAsLoanDisbursement?: boolean;
};

type TransferOptions = {
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency?: string;
  reference?: string;
  metadata?: Record<string, any>;
};

type WithdrawOptions = {
  userId: string;
  amount: number;
  currency?: string;
  reference?: string;
  metadata?: Record<string, any>;
};

type ListTransactionsOptions = {
  userId: string;
  limit?: number;
  offset?: number;
};

function toNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return 0;
  }
  return numeric;
}

async function fetchWallet(
  userId: string,
  trx: Knex.Transaction
): Promise<WalletSnapshot> {
  let wallet = await trx(WALLETS_TABLE)
    .where({ user_id: userId })
    .forUpdate()
    .first();

  if (!wallet) {
    const now = trx.fn.now();
    const newWallet = {
      id: uuidv4(),
      user_id: userId,
      available_balance: 0,
      ledger_balance: 0,
      loan_balance: 0,
      currency: DEFAULT_CURRENCY,
      status: "active",
      created_at: now,
      updated_at: now,
    };
    await trx(WALLETS_TABLE).insert(newWallet);
    wallet = newWallet;
  }

  return {
    id: wallet.id,
    available_balance: toNumber(wallet.available_balance),
    ledger_balance: toNumber(wallet.ledger_balance),
    loan_balance: toNumber(wallet.loan_balance),
    currency: wallet.currency || DEFAULT_CURRENCY,
  };
}

async function insertTransaction(
  trx: Knex.Transaction,
  params: {
    walletId: string;
    type: WalletTransactionType;
    amount: number;
    currency: string;
    status?: WalletTransactionStatus;
    reference?: string;
    metadata?: Record<string, any>;
  }
) {
  const reference = params.reference || uuidv4();
  await trx(WALLET_TRANSACTIONS_TABLE).insert({
    id: uuidv4(),
    wallet_id: params.walletId,
    type: params.type,
    amount: params.amount,
    currency: params.currency,
    status: params.status || "completed",
    reference,
    metadata: params.metadata || null,
    created_at: trx.fn.now(),
    updated_at: trx.fn.now(),
  });
  return reference;
}

export async function fundWallet(options: FundOptions) {
  const amount = assertPositiveNumber(options.amount, "amount");
  const reference = options.reference || uuidv4();

  return db.transaction(async (trx) => {
    const wallet = await fetchWallet(options.userId, trx);
    const currency = options.currency || wallet.currency || DEFAULT_CURRENCY;

    const updated = {
      available_balance: wallet.available_balance + amount,
      ledger_balance: wallet.ledger_balance + amount,
      loan_balance: options.treatAsLoanDisbursement
        ? wallet.loan_balance + amount
        : wallet.loan_balance,
    };

    await trx(WALLETS_TABLE)
      .where({ id: wallet.id })
      .update({
        available_balance: updated.available_balance,
        ledger_balance: updated.ledger_balance,
        loan_balance: updated.loan_balance,
        currency,
        updated_at: trx.fn.now(),
      });

    const type: WalletTransactionType = options.treatAsLoanDisbursement
      ? "LOAN_DISBURSE"
      : "FUND";

    await insertTransaction(trx, {
      walletId: wallet.id,
      type,
      amount,
      currency,
      reference,
      metadata: options.metadata,
    });

    return {
      wallet_id: wallet.id,
      available_balance: updated.available_balance,
      ledger_balance: updated.ledger_balance,
      loan_balance: updated.loan_balance,
      currency,
      reference,
    };
  });
}

export async function transferFunds(options: TransferOptions) {
  if (options.fromUserId === options.toUserId) {
    throw new BadRequestError("Cannot transfer to the same user");
  }
  const amount = assertPositiveNumber(options.amount, "amount");
  const reference = options.reference || uuidv4();

  return db.transaction(async (trx) => {
    const sender = await fetchWallet(options.fromUserId, trx);
    const recipient = await fetchWallet(options.toUserId, trx);

    const currency = options.currency || sender.currency || DEFAULT_CURRENCY;
    if (sender.currency !== recipient.currency) {
      throw new BadRequestError("Wallet currencies do not match");
    }

    if (sender.available_balance < amount) {
      throw new ConflictError("Insufficient funds");
    }

    const senderUpdated = {
      available_balance: sender.available_balance - amount,
      ledger_balance: sender.ledger_balance - amount,
      loan_balance: sender.loan_balance,
    };

    const recipientUpdated = {
      available_balance: recipient.available_balance + amount,
      ledger_balance: recipient.ledger_balance + amount,
      loan_balance: recipient.loan_balance,
    };

    await trx(WALLETS_TABLE)
      .where({ id: sender.id })
      .update({
        available_balance: senderUpdated.available_balance,
        ledger_balance: senderUpdated.ledger_balance,
        loan_balance: senderUpdated.loan_balance,
        updated_at: trx.fn.now(),
      });

    await trx(WALLETS_TABLE)
      .where({ id: recipient.id })
      .update({
        available_balance: recipientUpdated.available_balance,
        ledger_balance: recipientUpdated.ledger_balance,
        loan_balance: recipientUpdated.loan_balance,
        updated_at: trx.fn.now(),
      });

    await insertTransaction(trx, {
      walletId: sender.id,
      type: "TRANSFER_OUT",
      amount,
      currency,
      reference: `${reference}-OUT`,
      metadata: { ...options.metadata, transfer_reference: reference },
    });

    await insertTransaction(trx, {
      walletId: recipient.id,
      type: "TRANSFER_IN",
      amount,
      currency,
      reference: `${reference}-IN`,
      metadata: { ...options.metadata, transfer_reference: reference },
    });

    return {
      reference,
      sender: {
        wallet_id: sender.id,
        available_balance: senderUpdated.available_balance,
        ledger_balance: senderUpdated.ledger_balance,
        loan_balance: senderUpdated.loan_balance,
      },
      recipient: {
        wallet_id: recipient.id,
        available_balance: recipientUpdated.available_balance,
        ledger_balance: recipientUpdated.ledger_balance,
        loan_balance: recipientUpdated.loan_balance,
      },
    };
  });
}

export async function withdrawFunds(options: WithdrawOptions) {
  const amount = assertPositiveNumber(options.amount, "amount");
  const reference = options.reference || uuidv4();

  return db.transaction(async (trx) => {
    const wallet = await fetchWallet(options.userId, trx);
    const currency = options.currency || wallet.currency || DEFAULT_CURRENCY;

    if (wallet.available_balance < amount) {
      throw new ConflictError("Insufficient funds");
    }

    const updated = {
      available_balance: wallet.available_balance - amount,
      ledger_balance: wallet.ledger_balance - amount,
      loan_balance: wallet.loan_balance,
    };

    await trx(WALLETS_TABLE)
      .where({ id: wallet.id })
      .update({
        available_balance: updated.available_balance,
        ledger_balance: updated.ledger_balance,
        loan_balance: updated.loan_balance,
        updated_at: trx.fn.now(),
      });

    await insertTransaction(trx, {
      walletId: wallet.id,
      type: "WITHDRAW",
      amount,
      currency,
      reference,
      metadata: options.metadata,
    });

    return {
      wallet_id: wallet.id,
      available_balance: updated.available_balance,
      ledger_balance: updated.ledger_balance,
      loan_balance: updated.loan_balance,
      currency,
      reference,
    };
  });
}

export async function listWalletTransactions(options: ListTransactionsOptions) {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const rows = await db(WALLET_TRANSACTIONS_TABLE)
    .join(WALLETS_TABLE, `${WALLET_TRANSACTIONS_TABLE}.wallet_id`, "=", `${WALLETS_TABLE}.id`)
    .where(`${WALLETS_TABLE}.user_id`, options.userId)
    .limit(limit)
    .offset(offset)
    .orderBy(`${WALLET_TRANSACTIONS_TABLE}.created_at`, "desc")
    .select(
      `${WALLET_TRANSACTIONS_TABLE}.id`,
      `${WALLET_TRANSACTIONS_TABLE}.wallet_id`,
      `${WALLET_TRANSACTIONS_TABLE}.type`,
      `${WALLET_TRANSACTIONS_TABLE}.amount`,
      `${WALLET_TRANSACTIONS_TABLE}.currency`,
      `${WALLET_TRANSACTIONS_TABLE}.status`,
      `${WALLET_TRANSACTIONS_TABLE}.reference`,
      `${WALLET_TRANSACTIONS_TABLE}.metadata`,
      `${WALLET_TRANSACTIONS_TABLE}.created_at`
    );

  return rows.map((row) => ({
    id: row.id,
    wallet_id: row.wallet_id,
    type: row.type,
    amount: toNumber(row.amount),
    currency: row.currency,
    status: row.status,
    reference: row.reference,
    metadata: row.metadata,
    created_at: row.created_at,
  }));
}


