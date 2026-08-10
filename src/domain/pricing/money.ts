export function roundHalfUp(n: number, d: number): number {
  return Math.floor((n + d / 2) / d);
}

export function percentToBp(percent: number): number {
  return Math.round(percent * 100);
}

export function bpToPercent(bp: number): number {
  return bp / 100;
}