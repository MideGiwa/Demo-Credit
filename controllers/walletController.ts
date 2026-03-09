import { Response, NextFunction } from "express";
import { ApiRequest, sendResponse } from "../models/api";
import { fundWallet, transferFunds, withdrawFunds, listWalletTransactions } from "../service/walletService";
import { BadRequestError, NotFoundError } from "../errors/HttpError";
import { db } from "../config/knex";
import { USERS_TABLE } from "../models/User";

async function resolveRecipientUserId(body: any): Promise<string> {
  if (body.recipientUserId) {
    return body.recipientUserId;
  }
  if (body.recipientEmail) {
    const user = await db(USERS_TABLE).where({ email: body.recipientEmail }).first();
    if (!user) {
      throw new NotFoundError("Recipient user not found");
    }
    return user.id;
  }
  throw new BadRequestError("recipientUserId or recipientEmail is required");
}

export async function fundWalletHandler(req: ApiRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new BadRequestError("User context is missing");
    }
    const { amount, currency, reference, metadata, treatAsLoanDisbursement } = req.body;
    const result = await fundWallet({
      userId: req.user.id,
      amount: Number(amount),
      currency,
      reference,
      metadata,
      treatAsLoanDisbursement: Boolean(treatAsLoanDisbursement),
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function transferFundsHandler(req: ApiRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new BadRequestError("User context is missing");
    }
    const { amount, currency, reference, metadata } = req.body;
    const recipientUserId = await resolveRecipientUserId(req.body);
    const result = await transferFunds({
      fromUserId: req.user.id,
      toUserId: recipientUserId,
      amount: Number(amount),
      currency,
      reference,
      metadata,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function withdrawFundsHandler(req: ApiRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new BadRequestError("User context is missing");
    }
    const { amount, currency, reference, metadata } = req.body;
    const result = await withdrawFunds({
      userId: req.user.id,
      amount: Number(amount),
      currency,
      reference,
      metadata,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listTransactionsHandler(req: ApiRequest, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new BadRequestError("User context is missing");
    }
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const rows = await listWalletTransactions({
      userId: req.user.id,
      limit,
      offset,
    });
    res.status(200).json({ transactions: rows });
  } catch (err) {
    next(err);
  }
}


