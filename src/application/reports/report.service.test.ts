import { UserModel } from "../../infrastructure/db/models/user.model";
import { MongoDocumentRepository } from "../../infrastructure/db/repositories/document.repository";
import { clearMongo, startMongo, stopMongo } from "../../test-utils/mongo";
import { createDocumentService } from "../documents/document.service";
import type { DocumentService } from "../documents/document.service.types";
import { createReportService } from "./report.service";
import type { ReportService } from "./report.service.types";

let reportService: ReportService;
let documentService: DocumentService;

beforeAll(async () => {
  await startMongo();
  const repo = new MongoDocumentRepository();
  reportService = createReportService(repo);
  documentService = createDocumentService(repo);
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(async () => {
  await clearMongo();
});

async function makeUser(email: string): Promise<string> {
  const u = await UserModel.create({ email, passwordHash: "x" });
  return String(u._id);
}

describe("ReportService.summary — BR-16 / BR-18", () => {
  test("empty range → 200 with all zeros, echoes from/to", async () => {
    const userId = await makeUser("a@example.com");
    const r = await reportService.summary(userId, "2025-01-01", "2025-01-31");
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    expect(r.value).toEqual({
      from: "2025-01-01",
      to: "2025-01-31",
      documentCount: 0,
      grandTotalCents: 0,
      totalTaxCents: 0,
      totalDiscountCents: 0,
    });
  });

  test("range boundaries are inclusive on both ends, with explicit from/to dates at UTC bounds", async () => {
    const userId = await makeUser("a@example.com");

    await documentService.create(userId, {
      title: "On from",
      customer: "C",
      issueDate: "2025-01-01",
      lines: [
        {
          description: "L",
          quantity: 1,
          unitPriceCents: 1000,
          discount: null,
          taxPercent: 10,
        },
      ],
    });
    await documentService.create(userId, {
      title: "Middle",
      customer: "C",
      issueDate: "2025-01-15",
      lines: [
        {
          description: "L",
          quantity: 1,
          unitPriceCents: 2000,
          discount: null,
          taxPercent: 10,
        },
      ],
    });
    await documentService.create(userId, {
      title: "On to",
      customer: "C",
      issueDate: "2025-01-31",
      lines: [
        {
          description: "L",
          quantity: 1,
          unitPriceCents: 3000,
          discount: null,
          taxPercent: 10,
        },
      ],
    });

    await documentService.create(userId, {
      title: "Before from",
      customer: "C",
      issueDate: "2024-12-31",
      lines: [
        {
          description: "L",
          quantity: 1,
          unitPriceCents: 999,
          discount: null,
          taxPercent: 0,
        },
      ],
    });
    await documentService.create(userId, {
      title: "After to",
      customer: "C",
      issueDate: "2025-02-01",
      lines: [
        {
          description: "L",
          quantity: 1,
          unitPriceCents: 888,
          discount: null,
          taxPercent: 0,
        },
      ],
    });

    const r = await reportService.summary(userId, "2025-01-01", "2025-01-31");
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;

    expect(r.value.documentCount).toBe(3);
    expect(r.value.grandTotalCents).toBe(6600);
    expect(r.value.totalTaxCents).toBe(600);
    expect(r.value.totalDiscountCents).toBe(0);
    expect(r.value.from).toBe("2025-01-01");
    expect(r.value.to).toBe("2025-01-31");
  });

  test("totals match the manual sum of documents in range", async () => {
    const userId = await makeUser("a@example.com");

    const r1 = await documentService.create(userId, {
      title: "1",
      customer: "C",
      issueDate: "2025-01-05",
      lines: [
        {
          description: "L",
          quantity: 2,
          unitPriceCents: 10000,
          discount: { type: "percent", percent: 10 },
          taxPercent: 5,
        },
      ],
    });
    const r2 = await documentService.create(userId, {
      title: "2",
      customer: "C",
      issueDate: "2025-01-20",
      lines: [
        {
          description: "L",
          quantity: 1,
          unitPriceCents: 5000,
          discount: null,
          taxPercent: 5,
        },
      ],
    });
    if (!r1.isOk() || !r2.isOk()) throw new Error("create failed");

    const expectedGrandTotal = r1.value.grandTotalCents + r2.value.grandTotalCents;
    const expectedTax = r1.value.totalTaxCents + r2.value.totalTaxCents;
    const expectedDiscount = r1.value.totalDiscountCents + r2.value.totalDiscountCents;

    const report = await reportService.summary(userId, "2025-01-01", "2025-01-31");
    expect(report.isOk()).toBe(true);
    if (!report.isOk()) return;
    expect(report.value.documentCount).toBe(2);
    expect(report.value.grandTotalCents).toBe(expectedGrandTotal);
    expect(report.value.totalTaxCents).toBe(expectedTax);
    expect(report.value.totalDiscountCents).toBe(expectedDiscount);
  });

  test("documents from another user in same range are NOT counted", async () => {
    const userA = await makeUser("a@example.com");
    const userB = await makeUser("b@example.com");

    await documentService.create(userA, {
      title: "A",
      customer: "C",
      issueDate: "2025-01-15",
      lines: [
        {
          description: "L",
          quantity: 1,
          unitPriceCents: 1000,
          discount: null,
          taxPercent: 0,
        },
      ],
    });
    await documentService.create(userB, {
      title: "B",
      customer: "C",
      issueDate: "2025-01-15",
      lines: [
        {
          description: "L",
          quantity: 1,
          unitPriceCents: 9999,
          discount: null,
          taxPercent: 0,
        },
      ],
    });

    const r = await reportService.summary(userA, "2025-01-01", "2025-01-31");
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    expect(r.value.documentCount).toBe(1);
    expect(r.value.grandTotalCents).toBe(1000);
  });
});
