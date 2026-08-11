import express from "express";
import request from "supertest";
import { createRateLimit } from "./rate-limit.middleware";

describe("rate-limit middleware", () => {
  test("exceeding the configured limit → 429 RATE_LIMITED", async () => {
    const app = express();
    const limiter = createRateLimit({
      windowMs: 60 * 1000,
      limit: 2,
      message: "Too many requests; try again later",
    });
    app.use(limiter);
    app.get("/", (_req, res) => res.status(200).json({ ok: true }));

    const first = await request(app).get("/");
    const second = await request(app).get("/");
    const third = await request(app).get("/");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests; try again later",
      },
    });
  });

  test("disabled: true → never returns 429 regardless of request count", async () => {
    const app = express();
    const limiter = createRateLimit({
      windowMs: 60 * 1000,
      limit: 1,
      message: "Too many requests; try again later",
      disabled: true,
    });
    app.use(limiter);
    app.get("/", (_req, res) => res.status(200).json({ ok: true }));

    const first = await request(app).get("/");
    const second = await request(app).get("/");
    const third = await request(app).get("/");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
  });
});
