import { describe, it, expect, vi } from "vitest";
import { fundWallet, transferFunds } from "../../service/walletService";
import { BadRequestError } from "../../errors/HttpError";

vi.mock("../../config/knex", () => {
  return {
    db: {
      transaction: () => {
        throw new Error("db.transaction should not be called in validation tests");
      },
    },
  };
});

describe("walletService validation", () => {
  it("fundWallet rejects non-positive amounts", async () => {
    await expect(
      fundWallet({
        userId: "user-1",
        amount: 0,
      })
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("transferFunds rejects same sender and recipient", async () => {
    await expect(
      transferFunds({
        fromUserId: "user-1",
        toUserId: "user-1",
        amount: 100,
      })
    ).rejects.toBeInstanceOf(BadRequestError);
  });
});


