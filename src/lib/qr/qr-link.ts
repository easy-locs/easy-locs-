/**
 * Build QR entry URLs — delegates to central buildAppLink.
 */
import { buildAppLink } from "@/lib/link/build-link";

export function buildQrEntryUrl(targetCode: string): string {
  return buildAppLink(`/qr/entry/${encodeURIComponent(targetCode)}`);
}
