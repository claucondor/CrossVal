import request from "supertest";
import { createApp } from "../app";
import { clearMongo, startMongo, stopMongo } from "../../../test-utils/mongo";

jest.setTimeout(30_000);

const app = createApp();

interface DocumentResponse {
  grandTotalCents: number;
  totalTaxCents: number;
  totalDiscountCents: number;
}

interface SummaryResponse {
  from: string;
  to: string;
  documentCount: number;
  grandTotalCents: number;
  totalTaxCents: number;
  totalDiscountCents: number;
}

interface SummaryTotals {
  documentCount: number;
  grandTotalCents: number;
  totalTaxCents: number;
  totalDiscountCents: number;
}

let token: string;

async function signupAndGetToken(email: string): Promise<string> {
  const res = await request(app).post("/api/v1/auth/signup").send({
    email,
    password: "password-1234",
  });
  expect(res.status).toBe(201);
  return res.body.token as string;
}

async function createDocument(
  authToken: string,
  issueDate: string,
  index: number,
): Promise<DocumentResponse> {
  const res = await request(app)
    .post("/api/v1/documents")
    .set("Authorization", `Bearer ${authToken}`)
    .send({
      title: `Report document ${index}`,
      customer: `Customer ${index}`,
      issueDate,
      lines: [
        {
          description: `Service ${index}`,
          quantity: index + 1,
          unitPriceCents: 1250 + index * 317,
          discount: { type: "percent", percent: 7.25 },
          taxPercent: 8.5,
        },
        {
          description: `Fee ${index}`,
          quantity: 2,
          unitPriceCents: 411 + index * 29,
          discount: { type: "fixed", amountCents: 13 + index },
          taxPercent: 3.75,
        },
      ],
    });

  expect(res.status).toBe(201);
  return res.body as DocumentResponse;
}

function sumTotals(documents: DocumentResponse[]): SummaryTotals {
  return documents.reduce<SummaryTotals>(
    (totals, document) => ({
      documentCount: totals.documentCount + 1,
      grandTotalCents: totals.grandTotalCents + document.grandTotalCents,
      totalTaxCents: totals.totalTaxCents + document.totalTaxCents,
      totalDiscountCents: totals.totalDiscountCents + document.totalDiscountCents,
    }),
    {
      documentCount: 0,
      grandTotalCents: 0,
      totalTaxCents: 0,
      totalDiscountCents: 0,
    },
  );
}

beforeAll(async () => {
  await startMongo();
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(async () => {
  await clearMongo();
  token = await signupAndGetToken("report-user@example.com");
});

describe("GET /api/v1/reports/summary", () => {
  test("aggregates the exact manual totals from documents created over HTTP", async () => {
    const documents = [
      await createDocument(token, "2025-03-05", 1),
      await createDocument(token, "2025-03-10", 2),
      await createDocument(token, "2025-03-20", 3),
      await createDocument(token, "2025-03-30", 4),
    ];
    const expected = sumTotals(documents);

    const res = await request(app)
      .get("/api/v1/reports/summary")
      .set("Authorization", `Bearer ${token}`)
      .query({ from: "2025-03-01", to: "2025-03-31" });

    expect(res.status).toBe(200);
    expect(res.body as SummaryResponse).toEqual({
      from: "2025-03-01",
      to: "2025-03-31",
      ...expected,
    });
  });

  test("includes both exact range boundaries and excludes the adjacent dates", async () => {
    const onFrom = await createDocument(token, "2025-04-10", 1);
    const inside = await createDocument(token, "2025-04-15", 2);
    const onTo = await createDocument(token, "2025-04-20", 3);
    await createDocument(token, "2025-04-09", 4);
    await createDocument(token, "2025-04-21", 5);
    const expected = sumTotals([onFrom, inside, onTo]);

    const res = await request(app)
      .get("/api/v1/reports/summary")
      .set("Authorization", `Bearer ${token}`)
      .query({ from: "2025-04-10", to: "2025-04-20" });

    expect(res.status).toBe(200);
    expect(res.body as SummaryResponse).toEqual({
      from: "2025-04-10",
      to: "2025-04-20",
      ...expected,
    });
  });

  test("returns zero totals for an empty range", async () => {
    const res = await request(app)
      .get("/api/v1/reports/summary")
      .set("Authorization", `Bearer ${token}`)
      .query({ from: "2025-05-01", to: "2025-05-31" });

    expect(res.status).toBe(200);
    expect(res.body as SummaryResponse).toEqual({
      from: "2025-05-01",
      to: "2025-05-31",
      documentCount: 0,
      grandTotalCents: 0,
      totalTaxCents: 0,
      totalDiscountCents: 0,
    });
  });

  test("does not include documents belonging to another user", async () => {
    const ownDocument = await createDocument(token, "2025-06-15", 1);
    const otherToken = await signupAndGetToken("other-report-user@example.com");
    await createDocument(otherToken, "2025-06-15", 10);
    const expected = sumTotals([ownDocument]);

    const res = await request(app)
      .get("/api/v1/reports/summary")
      .set("Authorization", `Bearer ${token}`)
      .query({ from: "2025-06-01", to: "2025-06-30" });

    expect(res.status).toBe(200);
    expect(res.body as SummaryResponse).toEqual({
      from: "2025-06-01",
      to: "2025-06-30",
      ...expected,
    });
  });

  test("returns 422 INVALID_DATE_RANGE when from is after to", async () => {
    const res = await request(app)
      .get("/api/v1/reports/summary")
      .set("Authorization", `Bearer ${token}`)
      .query({ from: "2025-07-31", to: "2025-07-01" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_DATE_RANGE");
    expect(res.body.error.field).toBe("from");
  });

  test("returns 422 INVALID_DATE_RANGE when from is missing", async () => {
    const res = await request(app)
      .get("/api/v1/reports/summary")
      .set("Authorization", `Bearer ${token}`)
      .query({ to: "2025-07-31" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_DATE_RANGE");
    expect(res.body.error.field).toBe("from");
  });

  test("returns 422 INVALID_DATE_RANGE for a calendarically invalid from date", async () => {
    const res = await request(app)
      .get("/api/v1/reports/summary")
      .set("Authorization", `Bearer ${token}`)
      .query({ from: "2024-13-01", to: "2024-12-31" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("INVALID_DATE_RANGE");
    expect(res.body.error.field).toBe("from");
  });
});
