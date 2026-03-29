/**
 * media.transport — Canonical barrel export for media transport layer.
 */
export { TransportPolicy, type TransportDecision } from "./transport-policy";
export { compressImage, type CompressResult } from "./compress-image";
export { transportUpload, transportUploadWithPrepare, type UploadResult, type TransportCallbacks } from "./transport-engine";
