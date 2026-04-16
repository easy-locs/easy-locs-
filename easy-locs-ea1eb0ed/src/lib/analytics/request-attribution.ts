const LS_ATTRIBUTION_KEY = "easylocs_request_attribution";
const ATTRIBUTION_TTL_MS = 30_000;

export interface RequestAttribution {
  requestId: string;
  source: string;
  channel?: string;
  referralCode?: string;
  timestamp: number;
  path: string;
  metadata?: Record<string, unknown>;
}

let _currentAttribution: RequestAttribution | null = null;

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isExpired(attr: RequestAttribution): boolean {
  return Date.now() - attr.timestamp > ATTRIBUTION_TTL_MS;
}

export function startRequestAttribution(
  source: string,
  path: string,
  options?: {
    channel?: string;
    referralCode?: string;
    metadata?: Record<string, unknown>;
  }
): RequestAttribution {
  const attribution: RequestAttribution = {
    requestId: generateRequestId(),
    source,
    channel: options?.channel,
    referralCode: options?.referralCode,
    timestamp: Date.now(),
    path,
    metadata: options?.metadata,
  };
  _currentAttribution = attribution;
  try {
    sessionStorage.setItem(LS_ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {}
  return attribution;
}

export function getCurrentAttribution(): RequestAttribution | null {
  if (_currentAttribution) {
    if (isExpired(_currentAttribution)) {
      clearAttribution();
      return null;
    }
    return _currentAttribution;
  }
  try {
    const raw = sessionStorage.getItem(LS_ATTRIBUTION_KEY);
    if (raw) {
      const parsed: RequestAttribution = JSON.parse(raw);
      if (isExpired(parsed)) {
        clearAttribution();
        return null;
      }
      _currentAttribution = parsed;
      return _currentAttribution;
    }
  } catch {}
  return null;
}

export function consumeAttribution(): RequestAttribution | null {
  const attr = getCurrentAttribution();
  if (attr) clearAttribution();
  return attr;
}

export function clearAttribution(): void {
  _currentAttribution = null;
  try {
    sessionStorage.removeItem(LS_ATTRIBUTION_KEY);
  } catch {}
}

export function withAttribution<T extends Record<string, unknown>>(
  data: T
): T & { _attribution?: { requestId: string; source: string; channel?: string } } {
  const attr = consumeAttribution();
  if (!attr) return data;
  return {
    ...data,
    _attribution: {
      requestId: attr.requestId,
      source: attr.source,
      channel: attr.channel,
    },
  };
}
