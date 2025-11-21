import express from "express";
import request from "supertest";
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import walletRouter from "../../router/walletRouter";
import { db } from "../../config/knex";
import { USERS_TABLE } from "../../models/User";
import { WALLETS_TABLE } from "../../models/Wallet";
import { AUTH_TOKENS_TABLE } from "../../models/AuthToken";
import { v4 as uuidv4 } from "uuid";

// Mock auth middleware to simulate a logged-in user
// We will ensure this user exists in the DB in beforeEach
const TEST_USER_ID = "test-user-id";
const TEST_USER_EMAIL = "test@example.com";

vi.mock("../../middleware/auth", () => {
  return {
    authenticate: (req: any, _res: any, next: any) => {
      req.user = {
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
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
    // Clean up
    await db(AUTH_TOKENS_TABLE).del();
    await db(WALLETS_TABLE).del();
    await db(USERS_TABLE).del();

    // Create test user
    await db(USERS_TABLE).insert({
      id: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      username: "testuser",
      password_hash: "hash",
      role: "user",
      token_version: 0,
    });

    // Create wallet for user
    await db(WALLETS_TABLE).insert({
      id: uuidv4(),
      user_id: TEST_USER_ID,
      available_balance: 0,
      ledger_balance: 0,
      loan_balance: 0,
      currency: "NGN",
    });
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("POST /wallet/fund updates wallet balance", async () => {
    const res = await request(app)
      .post("/wallet/fund")
      .send({ amount: 1000 });

    expect(res.status).toBe(200);
    expect(res.body.available_balance).toBe(1000);

    // Verify in DB
    const wallet = await db(WALLETS_TABLE).where({ user_id: TEST_USER_ID }).first();
    expect(wallet.available_balance).toBe(1000);
  });

  it("POST /wallet/transfer requires recipient", async () => {
    const res = await request(app)
      .post("/wallet/transfer")
      .send({ amount: 500 });

    expect(res.status).toBe(400);
  });

  it("POST /wallet/transfer succeeds with valid recipient", async () => {
    // Fund sender first
    await request(app).post("/wallet/fund").send({ amount: 1000 });

    // Create recipient
    const RECIPIENT_ID = "recipient-id";
    await db(USERS_TABLE).insert({
      id: RECIPIENT_ID,
      email: "recipient@example.com",
      username: "recipient",
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

    expect(res.status).toBe(200);

    // Verify balances
    const senderWallet = await db(WALLETS_TABLE).where({ user_id: TEST_USER_ID }).first();
    const recipientWallet = await db(WALLETS_TABLE).where({ user_id: RECIPIENT_ID }).first();

    expect(senderWallet.available_balance).toBe(500);
    expect(recipientWallet.available_balance).toBe(500);
  });

  it("POST /wallet/withdraw decreases balance", async () => {
    // Fund first
    await request(app).post("/wallet/fund").send({ amount: 1000 });

    const res = await request(app)
      .post("/wallet/withdraw")
      .send({ amount: 100 });

    expect(res.status).toBe(200);

    const wallet = await db(WALLETS_TABLE).where({ user_id: TEST_USER_ID }).first();
    expect(wallet.available_balance).toBe(900);
  });

  it("GET /wallet/transactions returns transactions list", async () => {
    // Perform a transaction to generate history
    await request(app).post("/wallet/fund").send({ amount: 1000 });

    const res = await request(app).get("/wallet/transactions");
    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(1);
    expect(res.body.transactions[0].type).toBe("FUND");
    expect(res.body.transactions[0].amount).toBe(1000);
  });
});


