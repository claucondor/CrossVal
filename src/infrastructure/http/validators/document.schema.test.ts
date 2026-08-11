import { Types } from "mongoose";
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

async function createDraftDocument(authToken: string): Promise<string> {
  const res = await request(app)
    .post("/api/v1/documents")
    .set("Authorization", `Bearer ${authToken}`)
    .send({
      title: "Audit doc",
      customer: "ACME",
      issueDate: "2025-01-15",
    });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

beforeAll(async () => {
  await startMongo();
  token = await signupAndGetToken("audit-user@example.com");
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

describe("POST /api/v1/documents — percentValue range (SDD §1.2, §2.3)", () => {
  test("taxPercent: -1 → 422 INVALID_PERCENT", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Quote",
        customer: "ACME",
        issueDate: "2025-01-15",
        lines: [{ description: "L1", quantity: 1, unitPriceCents: 1000, taxPercent: -1 }],
      });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_PERCENT");
  });

  test("taxPercent: 101 → 422 INVALID_PERCENT", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Quote",
        customer: "ACME",
        issueDate: "2025-01-15",
        lines: [{ description: "L1", quantity: 1, unitPriceCents: 1000, taxPercent: 101 }],
      });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_PERCENT");
  });

  test("discount.percent: 101 → 422 INVALID_PERCENT", async () => {
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
            discount: { type: "percent", percent: 101 },
          },
        ],
      });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_PERCENT");
  });
});

describe("POST /api/v1/documents — INVALID_DISCOUNT_SHAPE / INVALID_DISCOUNT_VALUE (BR-2, §5.5)", () => {
  const baseDoc = {
    title: "Quote",
    customer: "ACME",
    issueDate: "2025-01-15",
  };

  test("discount con ambas formas (fixed + percent) → 422 INVALID_DISCOUNT_SHAPE", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...baseDoc,
        lines: [
          {
            description: "L1",
            quantity: 1,
            unitPriceCents: 1000,
            discount: { type: "fixed", amountCents: 100, percent: 5 },
          },
        ],
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_DISCOUNT_SHAPE");
  });

  test("discount con type desconocido → 422 INVALID_DISCOUNT_SHAPE", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...baseDoc,
        lines: [
          {
            description: "L1",
            quantity: 1,
            unitPriceCents: 1000,
            discount: { type: "unknown", foo: 1 },
          },
        ],
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_DISCOUNT_SHAPE");
  });

  test("discount.fixed con amountCents negativo → 422 INVALID_DISCOUNT_VALUE", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...baseDoc,
        lines: [
          {
            description: "L1",
            quantity: 1,
            unitPriceCents: 1000,
            discount: { type: "fixed", amountCents: -5 },
          },
        ],
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_DISCOUNT_VALUE");
  });

  test("discount.fixed válido → 201", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...baseDoc,
        lines: [
          {
            description: "L1",
            quantity: 1,
            unitPriceCents: 1000,
            discount: { type: "fixed", amountCents: 100 },
          },
        ],
      });

    expect(res.status).toBe(201);
  });

  test("discount.percent válido → 201", async () => {
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        ...baseDoc,
        lines: [
          {
            description: "L1",
            quantity: 1,
            unitPriceCents: 1000,
            discount: { type: "percent", percent: 5 },
          },
        ],
      });

    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/v1/documents/:id — STATUS_NOT_PATCHABLE (BR-13)", () => {
  test("body con `status: finalized` → 422 STATUS_NOT_PATCHABLE", async () => {
    const docId = await createDraftDocument(token);

    const res = await request(app)
      .patch(`/api/v1/documents/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "finalized" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("STATUS_NOT_PATCHABLE");
  });

  test("body con `status: draft` → 422 STATUS_NOT_PATCHABLE (no se permite ningún valor)", async () => {
    const docId = await createDraftDocument(token);

    const res = await request(app)
      .patch(`/api/v1/documents/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "draft" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("STATUS_NOT_PATCHABLE");
  });

  test("PATCH normal con solo title/customer/issueDate → 200", async () => {
    const docId = await createDraftDocument(token);

    const res = await request(app)
      .patch(`/api/v1/documents/${docId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Renamed", customer: "Other", issueDate: "2025-02-01" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Renamed");
    expect(res.body.customer).toBe("Other");
    expect(res.body.issueDate).toBe("2025-02-01");
  });
});

describe("ObjectId inválido en params (§4.1.6 — mismo tratamiento que no existe)", () => {
  test("GET /documents/no-es-un-objectid → 404 DOCUMENT_NOT_FOUND, byte-identical to a real not-found (no field)", async () => {
    const res = await request(app)
      .get("/api/v1/documents/no-es-un-objectid")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      code: "DOCUMENT_NOT_FOUND",
      message: "Document not found",
    });
  });

  test("PATCH /documents/<válido>/lines/no-es-un-objectid → 404 LINE_NOT_FOUND, byte-identical to a real not-found (no field)", async () => {
    const validId = new Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/v1/documents/${validId}/lines/no-es-un-objectid`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "x" });

    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      code: "LINE_NOT_FOUND",
      message: "Line not found",
    });
  });

  test("DELETE /documents/no-es-un-objectid → 404 DOCUMENT_NOT_FOUND, byte-identical to a real not-found (no field)", async () => {
    const res = await request(app)
      .delete("/api/v1/documents/no-es-un-objectid")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({
      code: "DOCUMENT_NOT_FOUND",
      message: "Document not found",
    });
  });
});
