/**
 * Guest session management — allows unauthenticated visitors to chat,
 * send media, and communicate with providers.
 * Also provides simple guest ID for unauthenticated cart/loyalty/payment flows.
 */

const STORAGE_KEY = "easylocs_guest_session";
const GUEST_ID_KEY = "easylocs_guest_id";

/** Get or create a persistent guest ID (simple localStorage identity for non-auth flows) */
export function getGuestId(): string {
  let id: string | null = null;
  try { id = localStorage.getItem(GUEST_ID_KEY); } catch { /* */ }
  if (!id) {
    id = crypto.randomUUID();
    try { localStorage.setItem(GUEST_ID_KEY, id); } catch { /* */ }
  }
  return id;
}

/** Check if the current context is a guest (no authenticated user) */
export function isGuestUser(user: any): boolean {
  return !user;
}

/** Clear guest identity (e.g. after account creation) */
export function clearGuestId(): void {
  try { localStorage.removeItem(GUEST_ID_KEY); } catch { /* */ }
}
const FINGERPRINT_KEY = "easylocs_fp";

export interface GuestSession {
  id: string;
  token: string;
  expires_at: string;
  display_name: string;
  email?: string;
  org_id: string;
  context_type: string;
  context_id?: string;
}

interface SessionLimits {
  messages_remaining: number;
  media_remaining: number;
}

/** Simple browser fingerprint (non-tracking, just for rate limiting) */
export function getBrowserFingerprint(): string {
  try {
    const stored = sessionStorage.getItem(FINGERPRINT_KEY);
    if (stored) return stored;
    const fp = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
    ].join("|");
    const hash = Array.from(fp).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString(36);
    sessionStorage.setItem(FINGERPRINT_KEY, hash);
    return hash;
  } catch {
    return "unknown";
  }
}

/** Get cached guest session if still valid */
export function getCachedSession(): GuestSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session: GuestSession = JSON.parse(raw);
    if (new Date(session.expires_at) < new Date()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function cacheSession(session: GuestSession) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch { /* ignore */ }
}

const invokeGuestSession = async (body: Record<string, unknown>) => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/guest-session`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

/** Create a new guest session */
export async function createGuestSession(opts: {
  displayName: string;
  email?: string;
  orgId: string;
  contextType?: string;
  contextId?: string;
}): Promise<GuestSession> {
  const cached = getCachedSession();
  if (cached && cached.org_id === opts.orgId) return cached;

  const data = await invokeGuestSession({
    action: "create",
    display_name: opts.displayName,
    email: opts.email,
    fingerprint: getBrowserFingerprint(),
    org_id: opts.orgId,
    context_type: opts.contextType || "general",
    context_id: opts.contextId,
  });

  const session: GuestSession = {
    id: data.session.id,
    token: data.session.token,
    expires_at: data.session.expires_at,
    display_name: opts.displayName,
    email: opts.email,
    org_id: opts.orgId,
    context_type: opts.contextType || "general",
    context_id: opts.contextId,
  };
  cacheSession(session);
  return session;
}

/** Validate an existing session */
export async function validateGuestSession(token: string): Promise<{
  valid: boolean;
  session?: GuestSession;
  limits?: SessionLimits;
}> {
  return invokeGuestSession({ action: "validate", token });
}

/** Send a message as guest (with optional language for auto-translation) */
export async function sendGuestMessage(
  token: string,
  content: string,
  attachmentUrls?: string[],
  guestLocale?: string,
) {
  return invokeGuestSession({
    action: "send_message",
    token,
    content,
    attachment_urls: attachmentUrls,
    guest_locale: guestLocale,
  });
}

/** Get messages for a guest session */
export async function getGuestMessages(token: string) {
  return invokeGuestSession({ action: "get_messages", token });
}

/** Upload media as guest (uses anon key directly) */
export async function uploadGuestMedia(file: File, sessionId: string): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );

  const ext = file.name.split(".").pop() || "bin";
  const path = `guest/${sessionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("chat-media").upload(path, file);
  if (error) throw error;

  const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 30);
  return data?.signedUrl || path;
}
