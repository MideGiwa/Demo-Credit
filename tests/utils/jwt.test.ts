import { describe, it, expect } from "vitest";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";

describe("jwt utilities", () => {
  const payload = {
    id: "user-id-123",
    email: "user@example.com",
    role: "user" as const,
    token_version: 0,
  };

  it("signAccessToken and verifyAccessToken round-trip", () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.token_version).toBe(payload.token_version);
  });

  it("signRefreshToken and verifyRefreshToken round-trip", () => {
    const token = signRefreshToken(payload);
    const decoded = verifyRefreshToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.token_version).toBe(payload.token_version);
  });

  it("verifyAccessToken throws on invalid token", () => {
    const token = signAccessToken(payload);
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");

    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});


