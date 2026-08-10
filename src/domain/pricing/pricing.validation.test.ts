import { calculateLine } from "./pricing";
import { bpToPercent, percentToBp, roundHalfUp } from "./money";
import type { LineInput } from "./pricing.types";

const baseLine: LineInput = {
  quantity: 1,
  unitPriceCents: 10000,
  discount: null,
  taxBp: 0,
};

describe("calculateLine — validation (BR-10.1, §5.5)", () => {
  test("taxBp non-integer (500.5) → INVALID_PERCENT", () => {
    const result = calculateLine({ ...baseLine, taxBp: 500.5 });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_PERCENT");
    expect(result.error.field).toBe("taxBp");
  });

  test("taxBp negative (-1) → INVALID_PERCENT", () => {
    const result = calculateLine({ ...baseLine, taxBp: -1 });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_PERCENT");
    expect(result.error.field).toBe("taxBp");
  });

  test("taxBp > 10_000 (10_001) → INVALID_PERCENT", () => {
    const result = calculateLine({ ...baseLine, taxBp: 10_001 });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_PERCENT");
    expect(result.error.field).toBe("taxBp");
  });

  test("discount.percentBp non-integer → INVALID_PERCENT", () => {
    const result = calculateLine({
      ...baseLine,
      discount: { type: "percent", percentBp: 100.5 },
    });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_PERCENT");
    expect(result.error.field).toBe("discount.percentBp");
  });

  test("discount.percentBp negative → INVALID_PERCENT", () => {
    const result = calculateLine({
      ...baseLine,
      discount: { type: "percent", percentBp: -1 },
    });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_PERCENT");
    expect(result.error.field).toBe("discount.percentBp");
  });

  test("discount.percentBp > 10_000 → INVALID_PERCENT", () => {
    const result = calculateLine({
      ...baseLine,
      discount: { type: "percent", percentBp: 10_001 },
    });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_PERCENT");
    expect(result.error.field).toBe("discount.percentBp");
  });

  test("discount.amountCents (fixed) non-integer → INVALID_DISCOUNT_VALUE", () => {
    const result = calculateLine({
      ...baseLine,
      discount: { type: "fixed", amountCents: 100.5 },
    });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_DISCOUNT_VALUE");
    expect(result.error.field).toBe("discount.amountCents");
  });

  test("discount.amountCents (fixed) negative → INVALID_DISCOUNT_VALUE", () => {
    const result = calculateLine({
      ...baseLine,
      discount: { type: "fixed", amountCents: -1 },
    });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_DISCOUNT_VALUE");
    expect(result.error.field).toBe("discount.amountCents");
  });

  test("quantity === 0 → INVALID_QUANTITY", () => {
    const result = calculateLine({ ...baseLine, quantity: 0 });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_QUANTITY");
    expect(result.error.field).toBe("quantity");
  });

  test("quantity > 10_000 (10_001) → INVALID_QUANTITY", () => {
    const result = calculateLine({ ...baseLine, quantity: 10_001 });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_QUANTITY");
    expect(result.error.field).toBe("quantity");
  });

  test("unitPriceCents negative (-1) → INVALID_UNIT_PRICE", () => {
    const result = calculateLine({ ...baseLine, unitPriceCents: -1 });
    expect(result.isErr()).toBe(true);
    if (!result.isErr()) return;
    expect(result.error.code).toBe("INVALID_UNIT_PRICE");
    expect(result.error.field).toBe("unitPriceCents");
  });
});

describe("money.ts — roundHalfUp", () => {
  test("exact .5 tie → half-up (roundHalfUp(15000, 10000) === 2)", () => {
    expect(roundHalfUp(15000, 10000)).toBe(2);
  });

  test("roundHalfUp(0, d) === 0", () => {
    expect(roundHalfUp(0, 10000)).toBe(0);
  });

  test("§6.2 step-by-step: roundHalfUp(18000 * 500, 10000) === 900", () => {
    expect(roundHalfUp(18000 * 500, 10000)).toBe(900);
  });

  test("top-of-magnitude: lineSubtotalCents ~1e11 with taxBp 10000 — no overflow, lineTotalCents === 2e11", () => {
    const result = calculateLine({
      quantity: 10_000,
      unitPriceCents: 10_000_000,
      discount: null,
      taxBp: 10_000,
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.lineSubtotalCents).toBe(1e11);
    expect(result.value.taxAmountCents).toBe(1e11);
    expect(result.value.lineTotalCents).toBe(2e11);
  });
});

describe("money.ts — percentToBp / bpToPercent", () => {
  test("percentToBp(7.25) === 725", () => {
    expect(percentToBp(7.25)).toBe(725);
  });

  test("percentToBp(0) === 0", () => {
    expect(percentToBp(0)).toBe(0);
  });

  test("percentToBp(100) === 10000", () => {
    expect(percentToBp(100)).toBe(10000);
  });

  test("bpToPercent(725) === 7.25", () => {
    expect(bpToPercent(725)).toBe(7.25);
  });

  test("round-trip percentToBp(bpToPercent(x)) === x for 725, 10000, 0", () => {
    expect(percentToBp(bpToPercent(725))).toBe(725);
    expect(percentToBp(bpToPercent(10000))).toBe(10000);
    expect(percentToBp(bpToPercent(0))).toBe(0);
  });

  // The SDD §2.3 rejection of values like 7.333 (1e-9 around integer check) is a HTTP-layer Zod concern; percentToBp here is a plain Math.round, so it just returns the nearest integer.
  test("percentToBp(7.333) === 733 (HTTP Zod rejects 1e-9-around-integer; this function only rounds)", () => {
    expect(percentToBp(7.333)).toBe(733);
  });
});
