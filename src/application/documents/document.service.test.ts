import { Types } from "mongoose";
import { DocumentModel } from "../../infrastructure/db/models/document.model";
import { UserModel } from "../../infrastructure/db/models/user.model";
import { MongoDocumentRepository } from "../../infrastructure/db/repositories/document.repository";
import { clearMongo, startMongo, stopMongo } from "../../test-utils/mongo";
import { createDocumentService } from "./document.service";
import type { DocumentService } from "./document.service.types";

let service: DocumentService;

beforeAll(async () => {
  await startMongo();
  service = createDocumentService(new MongoDocumentRepository());
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

const sampleLine = {
  description: "L1",
  quantity: 1,
  unitPriceCents: 1000,
  discount: null,
  taxPercent: 0,
};

async function createSampleDoc(userId: string): Promise<string> {
  const r = await service.create(userId, {
    title: "Quote",
    customer: "Customer",
    issueDate: "2025-01-15",
    lines: [sampleLine],
  });
  if (!r.isOk()) throw new Error(`create failed: ${r.error.code}`);
  return r.value.id;
}

describe("DocumentService — authorization and lifecycle (§4.2, BR-12, BR-14, BR-15)", () => {
  test("cross-user read → DOCUMENT_NOT_FOUND", async () => {
    const userA = await makeUser("a@example.com");
    const userB = await makeUser("b@example.com");
    const docId = await createSampleDoc(userA);

    const result = await service.findOne(userB, docId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("cross-user patch → DOCUMENT_NOT_FOUND (never reveals existence)", async () => {
    const userA = await makeUser("a@example.com");
    const userB = await makeUser("b@example.com");
    const docId = await createSampleDoc(userA);

    const result = await service.patch(userB, docId, { title: "Hijack" });
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("cross-user delete → DOCUMENT_NOT_FOUND", async () => {
    const userA = await makeUser("a@example.com");
    const userB = await makeUser("b@example.com");
    const docId = await createSampleDoc(userA);

    const result = await service.delete(userB, docId);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe("DOCUMENT_NOT_FOUND");
  });

  test("mutating a finalized doc → FINALIZED_DOCUMENT_IMMUTABLE", async () => {
    const userId = await makeUser("a@example.com");
    const docId = await createSampleDoc(userId);

    const finalizeResult = await service.finalize(userId, docId);
    expect(finalizeResult.isOk()).toBe(true);

    const patchResult = await service.patch(userId, docId, { title: "New" });
    expect(patchResult.isErr()).toBe(true);
    if (patchResult.isErr()) expect(patchResult.error.code).toBe("FINALIZED_DOCUMENT_IMMUTABLE");

    const addLineResult = await service.addLine(userId, docId, {
      description: "L2",
      quantity: 1,
      unitPriceCents: 500,
      discount: null,
      taxPercent: 0,
    });
    expect(addLineResult.isErr()).toBe(true);
    if (addLineResult.isErr()) {
      expect(addLineResult.error.code).toBe("FINALIZED_DOCUMENT_IMMUTABLE");
    }

    const deleteResult = await service.delete(userId, docId);
    expect(deleteResult.isErr()).toBe(true);
    if (deleteResult.isErr()) expect(deleteResult.error.code).toBe("FINALIZED_DOCUMENT_IMMUTABLE");
  });

  test("calling finalize twice → DOCUMENT_ALREADY_FINALIZED", async () => {
    const userId = await makeUser("a@example.com");
    const docId = await createSampleDoc(userId);

    const first = await service.finalize(userId, docId);
    expect(first.isOk()).toBe(true);

    const second = await service.finalize(userId, docId);
    expect(second.isErr()).toBe(true);
    if (second.isErr()) expect(second.error.code).toBe("DOCUMENT_ALREADY_FINALIZED");
  });

  test("finalize with 0 lines → DOCUMENT_HAS_NO_LINES", async () => {
    const userId = await makeUser("a@example.com");
    const doc = await DocumentModel.create({
      userId: new Types.ObjectId(userId),
      title: "Empty",
      customer: "C",
      issueDate: new Date("2025-01-15T00:00:00.000Z"),
      status: "draft",
      lines: [],
      subtotalCents: 0,
      totalDiscountCents: 0,
      totalTaxCents: 0,
      grandTotalCents: 0,
    });

    const result = await service.finalize(userId, doc._id.toString());
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe("DOCUMENT_HAS_NO_LINES");
  });

  test("duplicate → new draft, distinct id, totals recalculated (BR-15)", async () => {
    const userId = await makeUser("a@example.com");
    const r = await service.create(userId, {
      title: "Quote",
      customer: "Customer",
      issueDate: "2025-01-15",
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
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    const source = r.value;

    const dup = await service.duplicate(userId, source.id);
    expect(dup.isOk()).toBe(true);
    if (!dup.isOk()) return;
    const copy = dup.value;

    expect(copy.id).not.toBe(source.id);
    expect(copy.status).toBe("draft");
    expect(copy.title).toBe(source.title);
    expect(copy.customer).toBe(source.customer);
    expect(copy.issueDate).toBe(source.issueDate);
    expect(copy.subtotalCents).toBe(source.subtotalCents);
    expect(copy.totalDiscountCents).toBe(source.totalDiscountCents);
    expect(copy.totalTaxCents).toBe(source.totalTaxCents);
    expect(copy.grandTotalCents).toBe(source.grandTotalCents);
    expect(copy.lines).toHaveLength(source.lines.length);
    for (let i = 0; i < copy.lines.length; i++) {
      expect(copy.lines[i].id).not.toBe(source.lines[i].id);
      expect(copy.lines[i].lineSubtotalCents).toBe(source.lines[i].lineSubtotalCents);
    }

    expect(copy.grandTotalCents).toBe(42150);
    expect(copy.subtotalCents).toBe(45000);
    expect(copy.totalDiscountCents).toBe(4000);
    expect(copy.totalTaxCents).toBe(1150);
  });
});
