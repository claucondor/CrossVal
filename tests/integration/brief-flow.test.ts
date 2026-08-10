import request from "supertest";
import { createApp } from "../../src/infrastructure/http/app";
import { startMongo, stopMongo, clearMongo } from "../../src/test-utils/mongo";

jest.setTimeout(30_000);

const app = createApp();

interface DocumentResponse {
  id: string;
  title: string;
  customer: string;
  issueDate: string;
  status: "draft" | "finalized";
  lines: Array<{ id: string }>;
  subtotalCents: number;
  totalDiscountCents: number;
  totalTaxCents: number;
  grandTotalCents: number;
  createdAt: string;
  updatedAt: string;
}

interface SummaryReportResponse {
  from: string;
  to: string;
  documentCount: number;
  grandTotalCents: number;
  totalTaxCents: number;
  totalDiscountCents: number;
}

beforeAll(async () => {
  await startMongo();
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(async () => {
  await clearMongo();
});

describe("brief flow — SDD §6.2 example end-to-end", () => {
  test("signup → create with §6.2 lines → finalize → edit (409) → duplicate → report (sums match)", async () => {
    // 1. signup
    const signupRes = await request(app).post("/api/v1/auth/signup").send({
      email: "brief-user@example.com",
      password: "password-1234",
    });
    expect(signupRes.status).toBe(201);
    const token = signupRes.body.token as string;

    // 2. create document with the exact 3 lines from SDD §6.2
    const issueDate = "2025-08-15";
    const createRes = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Brief example quote",
        customer: "ACME Co.",
        issueDate,
        lines: [
          {
            description: "Widget A",
            quantity: 2,
            unitPriceCents: 10000,
            discount: { type: "percent", percent: 10 },
            taxPercent: 5,
          },
          {
            description: "Widget B",
            quantity: 1,
            unitPriceCents: 5000,
            discount: null,
            taxPercent: 5,
          },
          {
            description: "Service fee",
            quantity: 1,
            unitPriceCents: 20000,
            discount: { type: "fixed", amountCents: 2000 },
            taxPercent: 0,
          },
        ],
      });

    // 3. verify 201 + the exact totals from §6.2
    expect(createRes.status).toBe(201);
    const created = createRes.body as DocumentResponse;
    expect(created.id).toEqual(expect.any(String));
    expect(created.status).toBe("draft");
    expect(created.subtotalCents).toBe(45000);
    expect(created.totalDiscountCents).toBe(4000);
    expect(created.totalTaxCents).toBe(1150);
    expect(created.grandTotalCents).toBe(42150);
    const originalId = created.id;

    // 4. finalize
    const finalizeRes = await request(app)
      .post(`/api/v1/documents/${originalId}/finalize`)
      .set("Authorization", `Bearer ${token}`);
    expect(finalizeRes.status).toBe(200);
    expect((finalizeRes.body as DocumentResponse).status).toBe("finalized");

    // 5. attempt to edit the finalized document → 409 FINALIZED_DOCUMENT_IMMUTABLE
    const editRes = await request(app)
      .patch(`/api/v1/documents/${originalId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "too late" });
    expect(editRes.status).toBe(409);
    expect(editRes.body.error.code).toBe("FINALIZED_DOCUMENT_IMMUTABLE");

    // 6. duplicate → 201, draft, different id, recalculated totals match
    const dupRes = await request(app)
      .post(`/api/v1/documents/${originalId}/duplicate`)
      .set("Authorization", `Bearer ${token}`);
    expect(dupRes.status).toBe(201);
    const duplicated = dupRes.body as DocumentResponse;
    expect(duplicated.status).toBe("draft");
    expect(duplicated.id).toEqual(expect.any(String));
    expect(duplicated.id).not.toBe(originalId);
    expect(duplicated.subtotalCents).toBe(45000);
    expect(duplicated.totalDiscountCents).toBe(4000);
    expect(duplicated.totalTaxCents).toBe(1150);
    expect(duplicated.grandTotalCents).toBe(42150);

    // 7. summary report covers the issue date and aggregates both docs
    //    (the finalized original + the duplicated draft) per BR-16.
    const reportRes = await request(app)
      .get("/api/v1/reports/summary")
      .set("Authorization", `Bearer ${token}`)
      .query({ from: "2025-08-01", to: "2025-08-31" });
    expect(reportRes.status).toBe(200);
    const expected: SummaryReportResponse = {
      from: "2025-08-01",
      to: "2025-08-31",
      documentCount: 2,
      grandTotalCents: created.grandTotalCents + duplicated.grandTotalCents,
      totalTaxCents: created.totalTaxCents + duplicated.totalTaxCents,
      totalDiscountCents: created.totalDiscountCents + duplicated.totalDiscountCents,
    };
    expect(reportRes.body).toEqual(expected);
  });
});
