import request from "supertest";
import { createApp } from "../../src/infrastructure/http/app";
import { startMongo, stopMongo } from "../../src/test-utils/mongo";

jest.setTimeout(30_000);

const app = createApp();

interface DocumentResponse {
  id: string;
  title: string;
  status: "draft" | "finalized";
  lines: Array<{ id: string; description: string }>;
  grandTotalCents: number;
  subtotalCents: number;
  totalDiscountCents: number;
  totalTaxCents: number;
}

interface DocumentSummaryResponse {
  id: string;
  status: "draft" | "finalized";
}

async function signup(email: string): Promise<string> {
  const res = await request(app).post("/api/v1/auth/signup").send({
    email,
    password: "password-1234",
  });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

let tokenA: string;
let tokenB: string;
let docIdA: string;
let lineIdA: string;

beforeAll(async () => {
  await startMongo();
  tokenA = await signup("user-a@example.com");
  tokenB = await signup("user-b@example.com");

  const createRes = await request(app)
    .post("/api/v1/documents")
    .set("Authorization", `Bearer ${tokenA}`)
    .send({
      title: "A's quote",
      customer: "A's customer",
      issueDate: "2025-09-10",
      lines: [
        {
          description: "A's only line",
          quantity: 1,
          unitPriceCents: 1000,
          discount: null,
          taxPercent: 0,
        },
      ],
    });
  expect(createRes.status).toBe(201);
  const created = createRes.body as DocumentResponse;
  docIdA = created.id;
  lineIdA = created.lines[0].id;
});

afterAll(async () => {
  await stopMongo();
});

describe("cross-user isolation — BR-17 / §4.1.5 (404, never 200, never 403)", () => {
  test("GET /api/v1/documents/:id — B cannot read A's document", async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${docIdA}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("PATCH /api/v1/documents/:id — B cannot edit A's metadata", async () => {
    const res = await request(app)
      .patch(`/api/v1/documents/${docIdA}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ title: "hack" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("DELETE /api/v1/documents/:id — B cannot delete A's document", async () => {
    const res = await request(app)
      .delete(`/api/v1/documents/${docIdA}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("POST /api/v1/documents/:id/lines — B cannot add a line to A's document", async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docIdA}/lines`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        description: "injected",
        quantity: 1,
        unitPriceCents: 1,
      });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("PATCH /api/v1/documents/:id/lines/:lineId — B cannot edit A's line", async () => {
    const res = await request(app)
      .patch(`/api/v1/documents/${docIdA}/lines/${lineIdA}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ description: "hijack" });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("DELETE /api/v1/documents/:id/lines/:lineId — B cannot delete A's line", async () => {
    const res = await request(app)
      .delete(`/api/v1/documents/${docIdA}/lines/${lineIdA}`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("POST /api/v1/documents/:id/finalize — B cannot finalize A's document", async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docIdA}/finalize`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("POST /api/v1/documents/:id/duplicate — B cannot duplicate A's document", async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docIdA}/duplicate`)
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("A's document is intact after all of B's attempts — still draft, single line, untouched", async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${docIdA}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const doc = res.body as DocumentResponse;
    expect(doc.id).toBe(docIdA);
    expect(doc.status).toBe("draft");
    expect(doc.title).toBe("A's quote");
    expect(doc.lines).toHaveLength(1);
    expect(doc.lines[0].id).toBe(lineIdA);
    expect(doc.lines[0].description).toBe("A's only line");
    expect(doc.grandTotalCents).toBe(1000);
  });
});

describe("cross-user isolation — listing (BR-17)", () => {
  test("GET /api/v1/documents with B's token does not include A's document", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    const summaries = res.body.items as DocumentSummaryResponse[];
    const ids = summaries.map((d) => d.id);
    expect(ids).not.toContain(docIdA);
  });
});
