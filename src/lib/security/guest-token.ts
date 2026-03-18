/**
 * Lightweight guest session tokens.
 * In production, replace with HMAC-SHA256 signed JWTs.
 */
export function signGuestToken(payload: Record<string, unknown>): string {
  const json = JSON.stringify({
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 30 * 60 * 1000, // 30 min
  });
  return btoa(json);
}

export function verifyGuestToken(token: string): Record<string, unknown> | null {
  try {
    const payload = JSON.parse(atob(token));
    if (typeof payload.exp === "number" && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
