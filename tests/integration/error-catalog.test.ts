import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import request from "supertest";
import { env } from "../../src/config/env";
import { createApp } from "../../src/infrastructure/http/app";
import { clearMongo, startMongo, stopMongo } from "../../src/test-utils/mongo";

jest.setTimeout(30_000);

const app = createApp();
const token = jwt.sign(
  { sub: new Types.ObjectId().toString() },
  env.JWT_SECRET,
  { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions,
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

describe("HTTP error catalog", () => {
  test("POST /api/v1/auth/login request #11 → 429 RATE_LIMITED", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const res = await request(app).post("/api/v1/auth/login").send({
        email: `missing-${attempt}@example.com`,
        password: "wrong-password",
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    }

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "missing-10@example.com",
      password: "wrong-password",
    });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
  });

  test("POST /api/v1/auth/signup with malformed JSON → 400 MALFORMED_JSON", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .set("Content-Type", "application/json")
      .send('{"email": bad json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MALFORMED_JSON");
  });

  test("GET /api/v1/documents without Authorization → 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get("/api/v1/documents");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  test("GET /api/v1/documents with an invalid bearer token → 401 UNAUTHENTICATED", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .set("Authorization", "Bearer token-invalido-o-basura");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  test("GET /api/v1/esto-no-existe → 404 ROUTE_NOT_FOUND", async () => {
    const res = await request(app).get("/api/v1/esto-no-existe");

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  test("POST /api/v1/documents with a body over 100kb → 413 PAYLOAD_TOO_LARGE", async () => {
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
  });

  test("POST /api/v1/documents with an undeclared field → 422 VALIDATION_ERROR", async () => {
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
  });

  test("POST /api/v1/documents with 201 valid lines → 422 TOO_MANY_LINES", async () => {
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
  });
});
