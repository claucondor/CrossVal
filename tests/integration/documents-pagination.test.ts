import request from "supertest";
import { createApp } from "../../src/infrastructure/http/app";
import { clearMongo, startMongo, stopMongo } from "../../src/test-utils/mongo";

jest.setTimeout(30_000);

const app = createApp();

interface DocumentSummaryResponse {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  status: "draft" | "finalized";
  lineCount: number;
  grandTotalCents: number;
  createdAt: string;
  updatedAt: string;
}

interface DocumentListResponse {
  items: DocumentSummaryResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const SAMPLE_LINE = {
  description: "L",
  quantity: 1,
  unitPriceCents: 1000,
  discount: null,
  taxPercent: 0,
};

async function signup(email: string): Promise<string> {
  const res = await request(app).post("/api/v1/auth/signup").send({
    email,
    password: "password-1234",
  });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

async function createDoc(
  token: string,
  title: string,
  issueDate: string,
): Promise<string> {
  const res = await request(app)
    .post("/api/v1/documents")
    .set("Authorization", `Bearer ${token}`)
    .send({ title, customer: "C", issueDate, lines: [SAMPLE_LINE] });
  expect(res.status).toBe(201);
  return (res.body as { id: string }).id;
}

let token: string;

beforeAll(async () => {
  await startMongo();
  token = await signup("pagination-user@example.com");
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(async () => {
  await clearMongo();
});

describe("GET /api/v1/documents — pagination (SDD §5.1/§5.3/§5.5)", () => {
  test("1. without page/limit → defaults page=1, limit=20", async () => {
    await createDoc(token, "A", "2025-01-10");
    await createDoc(token, "B", "2025-02-10");
    await createDoc(token, "C", "2025-03-10");

    const res = await request(app)
      .get("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const body = res.body as DocumentListResponse;
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.total).toBe(3);
    expect(body.totalPages).toBe(1);
    expect(body.items).toHaveLength(3);
  });

  test("2. explicit page/limit → splits correctly", async () => {
    await createDoc(token, "A", "2025-01-10");
    await createDoc(token, "B", "2025-02-10");
    await createDoc(token, "C", "2025-03-10");

    const page1 = await request(app)
      .get("/api/v1/documents")
      .query({ page: 1, limit: 2 })
      .set("Authorization", `Bearer ${token}`);
    expect(page1.status).toBe(200);
    const page1Body = page1.body as DocumentListResponse;
    expect(page1Body.items).toHaveLength(2);
    expect(page1Body.page).toBe(1);
    expect(page1Body.limit).toBe(2);
    expect(page1Body.total).toBe(3);
    expect(page1Body.totalPages).toBe(2);

    const page2 = await request(app)
      .get("/api/v1/documents")
      .query({ page: 2, limit: 2 })
      .set("Authorization", `Bearer ${token}`);
    expect(page2.status).toBe(200);
    const page2Body = page2.body as DocumentListResponse;
    expect(page2Body.items).toHaveLength(1);
    expect(page2Body.page).toBe(2);
    expect(page2Body.total).toBe(3);
    expect(page2Body.totalPages).toBe(2);

    const page1Ids = page1Body.items.map((i) => i.id);
    const page2Ids = page2Body.items.map((i) => i.id);
    expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
  });

  test("3. page=0 → 422 INVALID_PAGINATION", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .query({ page: 0 })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_PAGINATION");
  });

  test("4. limit=0 → 422 INVALID_PAGINATION", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .query({ limit: 0 })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_PAGINATION");
  });

  test("5. limit=101 → 422 INVALID_PAGINATION", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .query({ limit: 101 })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_PAGINATION");
  });

  test("6. page=abc (non-integer) → 422 INVALID_PAGINATION", async () => {
    const res = await request(app)
      .get("/api/v1/documents")
      .query({ page: "abc" })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_PAGINATION");
  });

  test("7. order is issueDate desc, createdAt desc", async () => {
    await createDoc(token, "Oldest", "2025-01-10");
    await createDoc(token, "Middle", "2025-02-10");
    const newestId = await createDoc(token, "Newest", "2025-03-10");

    const res = await request(app)
      .get("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const items = (res.body as DocumentListResponse).items;
    expect(items).toHaveLength(3);
    expect(items[0].id).toBe(newestId);
    expect(items[0].title).toBe("Newest");
    expect(items[1].title).toBe("Middle");
    expect(items[2].title).toBe("Oldest");
  });
});
