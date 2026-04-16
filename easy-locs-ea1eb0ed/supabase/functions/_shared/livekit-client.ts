const LIVEKIT_API_KEY_ENV = "LIVEKIT_API_KEY";
const LIVEKIT_API_SECRET_ENV = "LIVEKIT_API_SECRET";
const LIVEKIT_URL_ENV = "LIVEKIT_URL";

function getLiveKitCredentials(): { apiKey: string; apiSecret: string; url: string } {
  const apiKey = Deno.env.get(LIVEKIT_API_KEY_ENV);
  const apiSecret = Deno.env.get(LIVEKIT_API_SECRET_ENV);
  const url = Deno.env.get(LIVEKIT_URL_ENV);
  if (!apiKey || !apiSecret || !url) {
    throw new Error("LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL must be configured");
  }
  return { apiKey, apiSecret, url };
}

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacSign(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

export interface RoomTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName?: string;
  ttlSeconds?: number;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  isRecorder?: boolean;
}

export async function generateRoomToken(options: RoomTokenOptions): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitCredentials();
  const now = Math.floor(Date.now() / 1000);
  const ttl = options.ttlSeconds ?? 3600;

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const grant: Record<string, unknown> = {
    roomJoin: true,
    room: options.roomName,
    canPublish: options.canPublish ?? true,
    canSubscribe: options.canSubscribe ?? true,
    canPublishData: options.canPublishData ?? true,
  };

  if (options.isRecorder) {
    grant.recorder = true;
    grant.hidden = true;
  }

  const payload = {
    iss: apiKey,
    sub: options.participantIdentity,
    name: options.participantName ?? options.participantIdentity,
    nbf: now,
    exp: now + ttl,
    iat: now,
    jti: crypto.randomUUID(),
    video: grant,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = await hmacSign(apiSecret, signingInput);

  return `${signingInput}.${signature}`;
}

export interface RoomInfo {
  name: string;
  sid: string;
  numParticipants: number;
  maxParticipants: number;
  creationTime: number;
}

async function generateServerToken(grants: Record<string, unknown>): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitCredentials();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    iss: apiKey,
    sub: "server",
    nbf: now,
    exp: now + 60,
    iat: now,
    jti: crypto.randomUUID(),
    video: grants,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = await hmacSign(apiSecret, signingInput);

  return `${signingInput}.${signature}`;
}

export async function createRoom(
  roomName: string,
  options?: { maxParticipants?: number; emptyTimeout?: number }
): Promise<RoomInfo> {
  const { url } = getLiveKitCredentials();
  const token = await generateServerToken({ roomCreate: true });

  const response = await fetch(`${url}/twirp/livekit.RoomService/CreateRoom`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: roomName,
      max_participants: options?.maxParticipants ?? 50,
      empty_timeout: options?.emptyTimeout ?? 300,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LiveKit room creation failed [${response.status}]: ${err}`);
  }

  return response.json();
}

export async function listRooms(): Promise<RoomInfo[]> {
  const { url } = getLiveKitCredentials();
  const token = await generateServerToken({ roomList: true });

  const response = await fetch(`${url}/twirp/livekit.RoomService/ListRooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LiveKit list rooms failed [${response.status}]: ${err}`);
  }

  const data = await response.json();
  return data.rooms ?? [];
}

export function getLiveKitUrl(): string {
  return getLiveKitCredentials().url;
}
