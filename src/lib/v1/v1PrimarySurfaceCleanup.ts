export type VisiblePrimaryEntry = {
  key: string;
  label: string;
  path: string;
};

const ALLOWED_PRIMARY_KEYS = new Set([
  "home",
  "orbit",
  "achille",
  "ride",
  "send_package",
  "wallet",
  "notifications",
  "settings",
  "merchant_pos",
  "merchant_qr",
  "merchant_orders",
  "merchant_payments",
]);

export function keepOnlyV1PrimaryEntries<T extends { key: string }>(entries: T[]) {
  return entries.filter((entry) => ALLOWED_PRIMARY_KEYS.has(entry.key));
}
