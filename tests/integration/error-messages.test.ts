import { Types } from "mongoose";
import jwt, { type SignOptions } from "jsonwebtoken";
import request from "supertest";
import type { NextFunction, Request, Response } from "express";
import { env } from "../../src/config/env";
import { createApp } from "../../src/infrastructure/http/app";
import { errorHandler } from "../../src/infrastructure/http/middlewares/error-handler.middleware";
import { clearMongo, startMongo, stopMongo } from "../../src/test-utils/mongo";
import { calculateLine } from "../../src/domain/pricing/pricing";

jest.setTimeout(30_000);

const app = createApp();

const token = jwt.sign(
  { sub: new Types.ObjectId().toString() },
  env.JWT_SECRET,
  { expiresIn: env.JWT_EXPIRES_IN } as SignOptions,
);

beforeAll(async () => {
  await startMongo();
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(async () => {
  await clearMongo();
});

async function createDoc(
  lines: Array<Record<string, unknown>> = [
    { description: "L1", quantity: 1, unitPriceCents: 100 },
  ],
) {
  const res = await request(app)
    .post("/api/v1/documents")
    .set("Authorization", `Bearer ${token}`)
    .send({
      title: "Quote",
      customer: "Customer",
      issueDate: "2025-01-01",
      lines,
    });
  return {
    docId: res.body.id as string,
    lineId: res.body.lines[0]?.id as string | undefined,
  };
}

describe("Error messages are not just the codes", () => {
  test("MALFORMED_JSON message differs from code", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .set("Content-Type", "application/json")
      .send('{"email": bad json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MALFORMED_JSON");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("UNAUTHENTICATED message differs from code", async () => {
    const res = await request(app).get("/api/v1/documents");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("INVALID_CREDENTIALS message differs from code", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({
      email: `nope-${new Types.ObjectId().toString()}@example.com`,
      password: "wrong-password",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("ROUTE_NOT_FOUND message differs from code", async () => {
    const res = await request(app).get("/api/v1/no-existe");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("EMAIL_ALREADY_REGISTERED message differs from code", async () => {
    const email = `dup-${new Types.ObjectId().toString()}@example.com`;
    await request(app).post("/api/v1/auth/signup").send({
      email,
      password: "password123",
    });
    const res = await request(app).post("/api/v1/auth/signup").send({
      email,
      password: "password123",
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("DOCUMENT_NOT_FOUND message differs from code", async () => {
    const fakeId = new Types.ObjectId().toString();
    const res = await request(app)
      .get(`/api/v1/documents/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DOCUMENT_NOT_FOUND");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("LINE_NOT_FOUND message differs from code", async () => {
    const { docId } = await createDoc();
    const fakeLineId = new Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/v1/documents/${docId}/lines/${fakeLineId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 1 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("LINE_NOT_FOUND");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("FINALIZED_DOCUMENT_IMMUTABLE message differs from code", async () => {
    const { docId, lineId } = await createDoc();
    await request(app)
      .post(`/api/v1/documents/${docId}/finalize`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .patch(`/api/v1/documents/${docId}/lines/${lineId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 2 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("FINALIZED_DOCUMENT_IMMUTABLE");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("DOCUMENT_ALREADY_FINALIZED message differs from code", async () => {
    const { docId } = await createDoc();
    await request(app)
      .post(`/api/v1/documents/${docId}/finalize`)
      .set("Authorization", `Bearer ${token}`);
    const res = await request(app)
      .post(`/api/v1/documents/${docId}/finalize`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DOCUMENT_ALREADY_FINALIZED");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("PAYLOAD_TOO_LARGE message differs from code", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "x".repeat(101 * 1024),
        customer: "Customer",
        issueDate: "2025-01-01",
      });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("VALIDATION_ERROR message differs from code", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Quote",
        customer: "Customer",
        issueDate: "2025-01-01",
        campoQueNoExiste: true,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  // INVALID_QUANTITY and INVALID_UNIT_PRICE are domain-level codes (pricing.ts)
  // that are unreachable over HTTP: the Zod schema's own range checks on
  // quantity/unitPriceCents reject out-of-range values first, as VALIDATION_ERROR,
  // before a request ever reaches the domain engine. They're exercised directly
  // here, the same way pricing.test.ts / pricing.validation.test.ts already do.
  test("INVALID_QUANTITY message differs from code", () => {
    const result = calculateLine({
      quantity: 0,
      unitPriceCents: 1000,
      discount: null,
      taxBp: 0,
    });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_QUANTITY");
    expect(result.error.message).not.toBe(result.error.code);
  });

  test("INVALID_UNIT_PRICE message differs from code", () => {
    const result = calculateLine({
      quantity: 1,
      unitPriceCents: -1,
      discount: null,
      taxBp: 0,
    });

    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_UNIT_PRICE");
    expect(result.error.message).not.toBe(result.error.code);
  });

  test("INVALID_PERCENT message differs from code", async () => {
    const { docId, lineId } = await createDoc();
    const res = await request(app)
      .patch(`/api/v1/documents/${docId}/lines/${lineId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ taxPercent: 7.333 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_PERCENT");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("INVALID_DISCOUNT_SHAPE message differs from code", async () => {
    const { docId, lineId } = await createDoc();
    const res = await request(app)
      .patch(`/api/v1/documents/${docId}/lines/${lineId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        discount: { type: "fixed", amountCents: 100, percent: 5 },
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_DISCOUNT_SHAPE");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("INVALID_DISCOUNT_VALUE message differs from code", async () => {
    const { docId, lineId } = await createDoc();
    const res = await request(app)
      .patch(`/api/v1/documents/${docId}/lines/${lineId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        discount: { type: "fixed", amountCents: -5 },
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_DISCOUNT_VALUE");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("DISCOUNT_EXCEEDS_SUBTOTAL message differs from code", async () => {
    const { docId, lineId } = await createDoc([
      { description: "L1", quantity: 1, unitPriceCents: 5000 },
    ]);
    const res = await request(app)
      .patch(`/api/v1/documents/${docId}/lines/${lineId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        discount: { type: "fixed", amountCents: 5001 },
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("DISCOUNT_EXCEEDS_SUBTOTAL");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("TOO_MANY_LINES message differs from code", async () => {
    const lines = Array.from({ length: 201 }, (_, index) => ({
      description: `Line ${index}`,
      quantity: 1,
      unitPriceCents: 100,
    }));
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Quote",
        customer: "Customer",
        issueDate: "2025-01-01",
        lines,
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("TOO_MANY_LINES");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("DOCUMENT_HAS_NO_LINES message differs from code", async () => {
    const { docId } = await createDoc([]);
    const res = await request(app)
      .post(`/api/v1/documents/${docId}/finalize`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("DOCUMENT_HAS_NO_LINES");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("STATUS_NOT_PATCHABLE message differs from code", async () => {
    const { docId } = await createDoc();
    const res = await request(app)
      .patch(`/api/v1/documents/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "finalized" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("STATUS_NOT_PATCHABLE");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("INVALID_DATE_RANGE message differs from code", async () => {
    const res = await request(app)
      .get("/api/v1/reports/summary")
      .query({ to: "2025-12-31" })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_DATE_RANGE");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("RATE_LIMITED message differs from code", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app).post("/api/v1/auth/login").send({
        email: `missing-${attempt}@example.com`,
        password: "wrong-password",
      });
    }
    const res = await request(app).post("/api/v1/auth/login").send({
      email: "missing-10@example.com",
      password: "wrong-password",
    });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
    expect(res.body.error.message).not.toBe(res.body.error.code);
  });

  test("INTERNAL_ERROR message differs from code", () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const res = { status, json };
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      errorHandler(
        new Error("x"),
        {} as Request,
        res as unknown as Response,
        jest.fn() as NextFunction,
      );
    } finally {
      consoleError.mockRestore();
    }

    const body = json.mock.calls[0][0];
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toBe("INTERNAL_ERROR");
  });
});