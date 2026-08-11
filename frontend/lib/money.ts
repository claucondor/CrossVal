// Las tres únicas funciones del frontend que tocan números de dinero.
// Ver frontend-sdd.md §4.1 — regla crítica: el frontend NO hace aritmética
// de negocio sobre dinero. Estas son funciones puras de formato/parseo.

export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  return `${sign}${whole}.${frac.toString().padStart(2, "0")}`;
}

export function parseCentsInput(raw: string): number | null {
  if (raw === "") return null;
  if (raw.includes("-")) return null;
  if (!/^[\d.,]+$/.test(raw)) return null;
  const m = raw.match(/^(\d+)(?:[.,](\d+))?$/);
  if (!m) return null;
  const whole = m[1];
  const frac = m[2] ?? "";
  if (frac.length > 2) return null;
  return parseInt(whole + frac.padEnd(2, "0"), 10);
}

export function formatPercent(percent: number): string {
  return String(percent);
}
