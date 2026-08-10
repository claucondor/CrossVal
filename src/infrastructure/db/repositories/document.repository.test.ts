import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

import { MongoDocumentRepository } from "./document.repository";
import type { NewDocumentInput } from "./document.repository";

let mongod: MongoMemoryServer;

const repo = new MongoDocumentRepository();

const ALICE_ID = "0000000000000000000000aa";
const BOB_ID = "0000000000000000000000bb";

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

function makeDoc(overrides: Partial<NewDocumentInput> = {}): NewDocumentInput {
  return {
    title: "Sample",
    customer: "ACME Corp",
    issueDate: new Date("2026-01-15T00:00:00.000Z"),
    lines: [],
    subtotalCents: 10000,
    totalDiscountCents: 0,
    totalTaxCents: 500,
    grandTotalCents: 10500,
    ...overrides,
  };
}

describe("MongoDocumentRepository", () => {
  test("create + findOneForUser con el mismo userId → lo encuentra", async () => {
    const created = await repo.create(ALICE_ID, makeDoc());
    const found = await repo.findOneForUser(ALICE_ID, created._id.toString());

    expect(found).not.toBeNull();
    expect(found!._id.toString()).toBe(created._id.toString());
    expect(found!.title).toBe("Sample");
    expect(found!.userId.toString()).toBe(ALICE_ID);
  });

  test("findOneForUser con userId distinto al dueño → null (aislamiento)", async () => {
    const created = await repo.create(ALICE_ID, makeDoc());
    const found = await repo.findOneForUser(BOB_ID, created._id.toString());

    expect(found).toBeNull();
  });

  test("findOneForUser con id que no es ObjectId válido → null (no 500)", async () => {
    const found = await repo.findOneForUser(ALICE_ID, "not-a-valid-object-id");
    expect(found).toBeNull();
  });

  test("updateDraft sobre doc en draft → { kind: 'updated' }", async () => {
    const created = await repo.create(ALICE_ID, makeDoc({ title: "Old" }));
    const outcome = await repo.updateDraft(ALICE_ID, created._id.toString(), {
      title: "New",
    });

    expect(outcome.kind).toBe("updated");
    if (outcome.kind !== "updated") return;
    expect(outcome.doc.title).toBe("New");
    expect(outcome.doc.status).toBe("draft");
  });

  test("updateDraft sobre doc ya finalizado → { kind: 'finalized' }", async () => {
    const created = await repo.create(ALICE_ID, makeDoc());
    const fin = await repo.finalize(ALICE_ID, created._id.toString());
    expect(fin.kind).toBe("updated");

    const outcome = await repo.updateDraft(ALICE_ID, created._id.toString(), {
      title: "New",
    });

    expect(outcome.kind).toBe("finalized");
  });

  test("updateDraft sobre id inexistente → { kind: 'not_found' }", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const outcome = await repo.updateDraft(ALICE_ID, fakeId, { title: "X" });

    expect(outcome.kind).toBe("not_found");
  });

  test("finalize dos veces sobre el mismo doc → la segunda { kind: 'finalized' }", async () => {
    const created = await repo.create(ALICE_ID, makeDoc());
    const first = await repo.finalize(ALICE_ID, created._id.toString());
    expect(first.kind).toBe("updated");

    const second = await repo.finalize(ALICE_ID, created._id.toString());
    expect(second.kind).toBe("finalized");
  });

  test("summary agrupa documentos dentro del rango y fuera del rango da ceros", async () => {
    const inRange1 = await repo.create(ALICE_ID, makeDoc({
      title: "Jan-15",
      issueDate: new Date("2026-01-15T12:00:00.000Z"),
      grandTotalCents: 100,
      totalTaxCents: 10,
      totalDiscountCents: 5,
    }));
    const inRange2 = await repo.create(ALICE_ID, makeDoc({
      title: "Feb-15",
      issueDate: new Date("2026-02-15T12:00:00.000Z"),
      grandTotalCents: 200,
      totalTaxCents: 20,
      totalDiscountCents: 10,
    }));
    await repo.create(ALICE_ID, makeDoc({
      title: "Mar-15",
      issueDate: new Date("2026-03-15T12:00:00.000Z"),
      grandTotalCents: 999,
      totalTaxCents: 99,
      totalDiscountCents: 99,
    }));

    const from = new Date("2026-01-01T00:00:00.000Z");
    const to = new Date("2026-02-28T23:59:59.999Z");
    const inside = await repo.summary(ALICE_ID, from, to);
    expect(inside).toEqual({
      documentCount: 2,
      grandTotalCents: 300,
      totalTaxCents: 30,
      totalDiscountCents: 15,
    });

    const outside = await repo.summary(ALICE_ID, new Date("2027-01-01T00:00:00.000Z"), new Date("2027-12-31T23:59:59.999Z"));
    expect(outside).toEqual({
      documentCount: 0,
      grandTotalCents: 0,
      totalTaxCents: 0,
      totalDiscountCents: 0,
    });

    expect(inRange1).toBeDefined();
    expect(inRange2).toBeDefined();
  });
});
