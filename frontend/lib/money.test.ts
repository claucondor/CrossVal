import { describe, test, expect } from "vitest";
import {
  formatCents,
  parseCentsInput,
  formatPercent,
  parsePercentInput,
} from "./money";

describe("formatCents", () => {
  test("42150 → '421.50'", () => {
    expect(formatCents(42150)).toBe("421.50");
  });

  test("0 → '0.00'", () => {
    expect(formatCents(0)).toBe("0.00");
  });

  test("5 → '0.05'", () => {
    expect(formatCents(5)).toBe("0.05");
  });
});

describe("parseCentsInput", () => {
  test("'100' → 10000", () => {
    expect(parseCentsInput("100")).toBe(10000);
  });

  test("'100.5' → 10050", () => {
    expect(parseCentsInput("100.5")).toBe(10050);
  });

  test("'100.55' → 10055", () => {
    expect(parseCentsInput("100.55")).toBe(10055);
  });

  test("'100,55' → 10055", () => {
    expect(parseCentsInput("100,55")).toBe(10055);
  });

  test("'100.555' → null (más de 2 decimales)", () => {
    expect(parseCentsInput("100.555")).toBeNull();
  });

  test("'' → null (vacío)", () => {
    expect(parseCentsInput("")).toBeNull();
  });

  test("'abc' → null (no numérico)", () => {
    expect(parseCentsInput("abc")).toBeNull();
  });

  test("'-5' → null (negativo)", () => {
    expect(parseCentsInput("-5")).toBeNull();
  });
});

describe("formatPercent", () => {
  test("7.25 → '7.25'", () => {
    expect(formatPercent(7.25)).toBe("7.25");
  });

  test("0 → '0' (sin ceros decimales innecesarios)", () => {
    expect(formatPercent(0)).toBe("0");
  });
});

describe("parsePercentInput", () => {
  test("'7.25' → 7.25", () => {
    expect(parsePercentInput("7.25")).toBe(7.25);
  });

  test("'0' → 0", () => {
    expect(parsePercentInput("0")).toBe(0);
  });

  test("'100' → 100", () => {
    expect(parsePercentInput("100")).toBe(100);
  });

  test("'7.333' → null (más de 2 decimales)", () => {
    expect(parsePercentInput("7.333")).toBeNull();
  });

  test("'101' → null (fuera de rango)", () => {
    expect(parsePercentInput("101")).toBeNull();
  });

  test("'-1' → null (negativo)", () => {
    expect(parsePercentInput("-1")).toBeNull();
  });

  test("'abc' → null (no numérico)", () => {
    expect(parsePercentInput("abc")).toBeNull();
  });

  test("'' → null (vacío)", () => {
    expect(parsePercentInput("")).toBeNull();
  });
});
