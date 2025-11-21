import { describe, it, expect } from "vitest";
import { authenticate, requireUser, requireAdmin } from "../../middleware/auth";
import { signAccessToken } from "../../utils/jwt";

function createMockReq(headers: any = {}, user?: any) {
  return {
    headers,
    user,
  } as any;
}

function createMockRes() {
  return {} as any;
}

function createNext() {
  const next = ((err?: any) => {
    (next as any).err = err;
  }) as any;
  return next;
}

describe("auth middlewares", () => {
  it("authenticate rejects missing bearer token", () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createNext();

    authenticate(req, res, next);

    expect(next.err).toBeDefined();
    expect(next.err.statusCode).toBe(401);
  });

  it("authenticate attaches user for valid token", () => {
    const token = signAccessToken({
      id: "user-id",
      email: "user@example.com",
      role: "user",
      token_version: 0,
    });

    const req = createMockReq({ authorization: `Bearer ${token}` });
    const res = createMockRes();
    const next = createNext();

    authenticate(req, res, next);

    expect(next.err).toBeUndefined();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe("user-id");
  });

  it("requireAdmin rejects non-admin user", () => {
    const req = createMockReq({}, {
      id: "user-id",
      email: "user@example.com",
      role: "user",
      token_version: 0,
    });
    const res = createMockRes();
    const next = createNext();

    requireAdmin(req, res, next);

    expect(next.err).toBeDefined();
    expect(next.err.statusCode).toBe(403);
  });
});
