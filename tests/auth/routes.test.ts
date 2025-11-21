import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../app";
import { db } from "../../config/knex";
import { USERS_TABLE } from "../../models/User";
import { AUTH_TOKENS_TABLE } from "../../models/AuthToken";
import { WALLETS_TABLE } from "../../models/Wallet";

// Keep AdjutorService mocked to avoid external API calls and rate limits
vi.mock("../../service/adjutorService", () => ({
  AdjutorService: {
    checkKarma: vi.fn().mockResolvedValue({ isBlacklisted: false }),
  },
}));

describe("auth routes", () => {
  beforeAll(async () => {
    // Migrations are run globally before tests
  });

  beforeEach(async () => {
    // Clean up tables
    await db(AUTH_TOKENS_TABLE).del();
    await db(WALLETS_TABLE).del();
    await db(USERS_TABLE).del();
  });

  afterAll(async () => {
    await db.destroy();
  });

  it("POST /auth/register creates a new user when data is valid", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        email: "newuser@example.com",
        username: "newuser",
        password: "valid-password",
      });

    expect(res.status).toBe(201);

    // Verify user in DB
    const user = await db(USERS_TABLE).where({ email: "newuser@example.com" }).first();
    expect(user).toBeDefined();
    expect(user.username).toBe("newuser");
  });

  it("POST /auth/register returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/auth/register").send({});
    expect(res.status).toBe(400);
  });

  it("POST /auth/login returns accessToken and sets refresh cookie for valid credentials", async () => {
    // Create user first
    await request(app)
      .post("/auth/register")
      .send({
        email: "user@example.com",
        username: "user",
        password: "valid-password",
      });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "user@example.com", password: "valid-password" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("POST /auth/login returns 401 for invalid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "unknown@example.com", password: "some-password" });

    expect(res.status).toBe(401);
  });
});


