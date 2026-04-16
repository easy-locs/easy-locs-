const SEGMENT_WRITE_KEY = () => Deno.env.get("SEGMENT_WRITE_KEY") ?? "";
const SEGMENT_API_URL = "https://api.segment.io/v1";

interface SegmentTrackPayload {
  userId: string;
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
  context?: Record<string, unknown>;
}

interface SegmentIdentifyPayload {
  userId: string;
  traits?: Record<string, unknown>;
  timestamp?: string;
}

async function segmentRequest(endpoint: string, payload: Record<string, unknown>): Promise<boolean> {
  const writeKey = SEGMENT_WRITE_KEY();
  if (!writeKey) {
    console.warn("[segment] SEGMENT_WRITE_KEY not configured, skipping event");
    return false;
  }

  try {
    const resp = await fetch(`${SEGMENT_API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(writeKey + ":")}`,
      },
      body: JSON.stringify({
        ...payload,
        timestamp: payload.timestamp ?? new Date().toISOString(),
        context: {
          ...(payload.context as Record<string, unknown> ?? {}),
          library: { name: "easy-locs-edge", version: "1.0.0" },
        },
      }),
    });

    if (!resp.ok) {
      console.error(`[segment] ${endpoint} failed: ${resp.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[segment] ${endpoint} error:`, err);
    return false;
  }
}

export async function segmentTrack(payload: SegmentTrackPayload): Promise<boolean> {
  return segmentRequest("track", payload);
}

export async function segmentIdentify(payload: SegmentIdentifyPayload): Promise<boolean> {
  return segmentRequest("identify", payload);
}

export function trackBackendEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  segmentTrack({ userId, event, properties }).catch((err) => {
    console.error(`[segment] Background track failed for ${event}:`, err);
  });
}
