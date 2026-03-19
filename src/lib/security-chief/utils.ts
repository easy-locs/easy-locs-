export function nowIso(): string {
  return new Date().toISOString();
}

export function randomHex(size = 16): string {
  const buf = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomNonce(): string {
  return `n_${randomHex(24)}`;
}

export function toBase64(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function sha256Base64(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toBase64(digest);
}

export async function stableJsonHash(obj: unknown): Promise<string> {
  const json = JSON.stringify(obj, Object.keys(obj as Record<string, unknown>).sort());
  return sha256Base64(json);
}

export function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
