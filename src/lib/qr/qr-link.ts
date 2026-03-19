/**
 * Build QR entry URLs — single source of truth for hash/non-hash routing.
 */
export function buildQrEntryUrl(targetCode: string): string {
  const base = window.location.origin;
  const isHash = window.location.href.includes("/#/");
  return isHash
    ? `${base}/#/qr/entry/${encodeURIComponent(targetCode)}`
    : `${base}/qr/entry/${encodeURIComponent(targetCode)}`;
}
