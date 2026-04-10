/**
 * ride-request-guard — Client-side dedup guard to prevent double-tap ride requests.
 */

const pendingKeys = new Map<string, number>();

function buildRideRequestKey(payload: {
  customer_user_id?: string | null;
  pickup_label?: string | null;
  dropoff_label?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
}) {
  return [
    payload.customer_user_id ?? "anon",
    payload.pickup_label ?? "",
    payload.dropoff_label ?? "",
    payload.pickup_lat ?? "",
    payload.pickup_lng ?? "",
    payload.dropoff_lat ?? "",
    payload.dropoff_lng ?? "",
  ].join("|");
}

export function canSubmitRideRequest(
  payload: Parameters<typeof buildRideRequestKey>[0],
  ttlMs = 10_000,
) {
  const key = buildRideRequestKey(payload);
  const now = Date.now();
  const existing = pendingKeys.get(key);

  if (existing && now - existing < ttlMs) {
    return { allowed: false, key };
  }

  pendingKeys.set(key, now);
  return { allowed: true, key };
}

export function releaseRideRequestGuard(key: string) {
  pendingKeys.delete(key);
}

export function cleanupRideRequestGuards(ttlMs = 10_000) {
  const now = Date.now();
  for (const [key, ts] of pendingKeys.entries()) {
    if (now - ts > ttlMs) pendingKeys.delete(key);
  }
}
