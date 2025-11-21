import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../utils/hash";

describe("hash utilities", () => {
  it("hashPassword and verifyPassword succeed for correct password", async () => {
    const plain = "MyS3cret!";
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash.length).toBeGreaterThan(0);

    const ok = await verifyPassword(plain, hash);
    expect(ok).toBe(true);
  });

  it("verifyPassword fails for incorrect password", async () => {
    const plain = "MyS3cret!";
    const hash = await hashPassword(plain);

    const ok = await verifyPassword("wrong-password", hash);
    expect(ok).toBe(false);
  });
});
