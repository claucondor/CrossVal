import request from "supertest";
import { createApp } from "../app";
import { startMongo, stopMongo, clearMongo } from "../../../test-utils/mongo";

const app = createApp();

let token: string;

async function signupAndGetToken(email: string): Promise<string> {
  const res = await request(app).post("/api/v1/auth/signup").send({
    email,
    password: "password-1234",
  });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

beforeAll(async () => {
  await startMongo();
  token = await signupAndGetToken("percent-user@example.com");
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(async () => {
  await clearMongo();
});

describe("POST /api/v1/documents — INVALID_PERCENT (SDD §2.3)", () => {
  test("lines[0].taxPercent: 7.333 → 422 INVALID_PERCENT", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Quote",
        customer: "ACME",
        issueDate: "2025-01-15",
        lines: [
          {
            description: "L1",
            quantity: 1,
            unitPriceCents: 1000,
            taxPercent: 7.333,
          },
        ],
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_PERCENT");
  });

  test("lines[0].discount.percent: 7.333 → 422 INVALID_PERCENT", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Quote",
        customer: "ACME",
        issueDate: "2025-01-15",
        lines: [
          {
            description: "L1",
            quantity: 1,
            unitPriceCents: 1000,
            discount: { type: "percent", percent: 7.333 },
          },
        ],
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_PERCENT");
  });

  test("lines[0].taxPercent: 7.25 (válido) → 201, y el round-trip devuelve 7.25", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Quote",
        customer: "ACME",
        issueDate: "2025-01-15",
        lines: [
          {
            description: "L1",
            quantity: 1,
            unitPriceCents: 1000,
            discount: null,
            taxPercent: 7.25,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.lines[0].taxPercent).toBe(7.25);
  });
});