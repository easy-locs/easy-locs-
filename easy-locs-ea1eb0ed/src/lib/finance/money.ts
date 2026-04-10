export function toMinor(amount: number): number {
  return Math.round(Number(amount || 0) * 100);
}
export function fromMinor(minor: number): number {
  return Number(minor || 0) / 100;
}
export function money(value: number, currency = "AED"): string {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
}
