import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { errorHandler } from "../../middleware/errorHandler";
import { BadRequestError } from "../../errors/HttpError";

describe("error handler middleware", () => {
  it("returns proper status and body for HttpError", async () => {
    const app = express();
    app.get("/bad", () => {
      throw new BadRequestError("Invalid something");
    });
    app.use(errorHandler);

    const res = await request(app).get("/bad");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid something");
  });
});


