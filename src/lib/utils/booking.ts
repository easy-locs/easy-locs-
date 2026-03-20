export function diffNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const diff = Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export function isRangeOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const startA = new Date(aStart).getTime();
  const endA = new Date(aEnd).getTime();
  const startB = new Date(bStart).getTime();
  const endB = new Date(bEnd).getTime();
  return startA < endB && startB < endA;
}
