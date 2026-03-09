import express from "express";
import request from "supertest";
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import walletRouter from "../../router/walletRouter";
import { db } from "../../config/knex";
import { USERS_TABLE } from "../../models/User";
import { WALLETS_TABLE } from "../../models/Wallet";
import { AUTH_TOKENS_TABLE } from "../../models/AuthToken";
import { v4 as uuidv4 } from "uuid";
import { WALLET_TRANSACTIONS_TABLE } from "../../models/WalletTransaction";
import { signAccessToken } from "../../utils/jwt";

let authToken: string;

// Mock auth middleware to simulate a logged-in user
// We will ensure this user exists in the DB in beforeEach
const TEST_USER_ID = "wallet-test-user-id";
const TEST_USER_EMAIL = "wallet_sender@example.com";

vi.mock("../../middleware/auth", () => {
  return {
    authenticate: (req: any, _res: any, next: any) => {
      req.user = {
        id: "wallet-test-user-id",
        email: "wallet_sender@example.com",
        role: "user",
        token_version: 0,
      };
      next();
    },
    requireUser: (_req: any, _res: any, next: any) => next(),
  };
});

const app = express();
app.use(express.json());
app.use("/wallet", walletRouter);

describe("wallet routes", () => {
  beforeAll(async () => {
    // Migrations are run globally before tests
  });

  beforeEach(async () => {
    console.log("Starting beforeEach cleanup...");
    // Clean up
    await db(WALLET_TRANSACTIONS_TABLE).del();
    await db(AUTH_TOKENS_TABLE).del();
    await db(WALLETS_TABLE).del();
    await db(USERS_TABLE).del();

    console.log("Cleanup done. Creating test user...");

    // Create test user
    await db(USERS_TABLE).insert({
      id: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      username: "wallet_sender",
      password_hash: "hash",
      role: "user",
      token_version: 0,
    });
    console.log("Test user created. Creating wallet...");

    // Create wallet for user
    await db(WALLETS_TABLE).insert({
      id: uuidv4(),
      user_id: TEST_USER_ID,
      available_balance: 0,
      ledger_balance: 0,
      loan_balance: 0,
      currency: "NGN",
    });
    console.log("Wallet created. Generating token...");

    // Generate token
    authToken = signAccessToken({
      id: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      role: "user",
      token_version: 0,
    });
    console.log("Token generated. beforeEach done.");
  });

  afterAll(async () => {
    // await db.destroy();
  });

  it("POST /wallet/fund updates wallet balance", async () => {
    const res = await request(app)
      .post("/wallet/fund")
      .send({ amount: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.data.available_balance).toBe(1000);

    // Verify in DB
    const wallets = await db(WALLETS_TABLE).select("*");
    console.log("All wallets in DB:", JSON.stringify(wallets, null, 2));

    const wallet = await db(WALLETS_TABLE).where({ user_id: TEST_USER_ID }).first();
    console.log("Fetched wallet for user:", TEST_USER_ID, wallet ? JSON.stringify(wallet, null, 2) : "undefined");

    if (wallets.length > 0) {
      console.log("Comparison:", {
        db_user_id: wallets[0].user_id,
        test_user_id: TEST_USER_ID,
        match: wallets[0].user_id === TEST_USER_ID
      });
    }

    expect(wallet).toBeDefined();
    expect(Number(wallet.available_balance)).toBe(1000);
  });

  it("POST /wallet/transfer requires recipient", async () => {
    const res = await request(app)
      .post("/wallet/transfer")
      .send({ amount: 500 });

    expect(res.status).toBe(400);
  });

  it("POST /wallet/transfer succeeds with valid recipient", { timeout: 10000 }, async () => {
    // Fund sender first
    const fundRes = await request(app).post("/wallet/fund").send({ amount: 1000 });
    expect(fundRes.status).toBe(200);

    // Create recipient
    const RECIPIENT_ID = "wallet-recipient-id";
    await db(USERS_TABLE).insert({
      id: RECIPIENT_ID,
      email: "wallet_recipient@example.com",
      username: "wallet_recipient",
      password_hash: "hash",
      role: "user",
      token_version: 0,
    });
    await db(WALLETS_TABLE).insert({
      id: uuidv4(),
      user_id: RECIPIENT_ID,
      available_balance: 0,
      ledger_balance: 0,
      loan_balance: 0,
      currency: "NGN",
    });

    const res = await request(app)
      .post("/wallet/transfer")
      .send({ amount: 500, recipientUserId: RECIPIENT_ID });

    if (res.status !== 200) {
      console.error("Transfer failed:", res.status, JSON.stringify(res.body, null, 2));
    }
    expect(res.status).toBe(200);

    // Verify balances
    const senderWallet = await db(WALLETS_TABLE).where({ user_id: TEST_USER_ID }).first();
    console.log("Sender wallet:", senderWallet ? "found" : "undefined");
    const recipientWallet = await db(WALLETS_TABLE).where({ user_id: RECIPIENT_ID }).first();
    console.log("Recipient wallet:", recipientWallet ? "found" : "undefined");

    expect(Number(senderWallet.available_balance)).toBe(500);
    expect(Number(recipientWallet.available_balance)).toBe(500);
  });

  it("POST /wallet/withdraw decreases balance", async () => {
    // Fund first
    const fundRes = await request(app).post("/wallet/fund").send({ amount: 1000 });
    expect(fundRes.status).toBe(200);

    const res = await request(app)
      .post("/wallet/withdraw")
      .send({ amount: 100 });

    expect(res.status).toBe(200);

    const wallet = await db(WALLETS_TABLE).where({ user_id: TEST_USER_ID }).first();
    expect(Number(wallet.available_balance)).toBe(900);
  });

  it("GET /wallet/transactions returns transactions list", async () => {
    // Perform a transaction to generate history
    const fundRes = await request(app).post("/wallet/fund").send({ amount: 1000 });
    expect(fundRes.status).toBe(200);

    const res = await request(app).get("/wallet/transactions");
    expect(res.status).toBe(200);
    expect(res.body.data.transactions).toHaveLength(1);
    expect(res.body.data.transactions[0].type).toBe("FUND");
    expect(res.body.data.transactions[0].amount).toBe(1000);
  });
});


