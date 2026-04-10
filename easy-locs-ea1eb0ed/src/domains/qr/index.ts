/**
 * QR Domain — Canonical exports.
 *
 * OWNER: qrStore
 * ENTRY: qrDispatch
 * PIPELINE: qr.pipeline
 */

export { useQrStore } from "./qr.store";
export type { QrScanStatus, QrActionType, QrResolvedPayload } from "./qr.store";

export { qrDispatch } from "./qr-dispatch";
export type { QrCommand, QrCommandResult } from "./qr-dispatch";

export { parseQrPayload, validateQrPayload } from "./qr.pipeline";
