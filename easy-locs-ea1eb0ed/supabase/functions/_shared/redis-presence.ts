import { redisSet, redisGet, redisDel, redisExists, redisMget, isRedisAvailable } from "./redis-client.ts";

const PRESENCE_TTL_SECONDS = 30;
const PRESENCE_KEY_PREFIX = "presence:";
const LAST_SEEN_KEY_PREFIX = "last_seen:";
const SESSION_KEY_PREFIX = "session:";

interface PresenceData {
  userId: string;
  status: "online" | "away" | "busy";
  lastHeartbeat: number;
  metadata?: Record<string, unknown>;
}

interface SessionData {
  userId: string;
  sessionId: string;
  startedAt: number;
  userAgent?: string;
  ip?: string;
}

export async function setPresence(
  userId: string,
  status: "online" | "away" | "busy" = "online",
  metadata?: Record<string, unknown>
): Promise<boolean> {
  if (!isRedisAvailable()) return false;

  const data: PresenceData = {
    userId,
    status,
    lastHeartbeat: Date.now(),
    metadata,
  };

  const stored = await redisSet(
    `${PRESENCE_KEY_PREFIX}${userId}`,
    data,
    PRESENCE_TTL_SECONDS
  );

  if (stored) {
    await redisSet(`${LAST_SEEN_KEY_PREFIX}${userId}`, Date.now());
  }

  return stored;
}

export async function removePresence(userId: string): Promise<void> {
  if (!isRedisAvailable()) return;
  await redisSet(`${LAST_SEEN_KEY_PREFIX}${userId}`, Date.now());
  await redisDel(`${PRESENCE_KEY_PREFIX}${userId}`);
}

export async function getPresence(userId: string): Promise<PresenceData | null> {
  return redisGet<PresenceData>(`${PRESENCE_KEY_PREFIX}${userId}`);
}

export async function isUserOnline(userId: string): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  const count = await redisExists(`${PRESENCE_KEY_PREFIX}${userId}`);
  return count > 0;
}

export async function getLastSeen(userId: string): Promise<number | null> {
  return redisGet<number>(`${LAST_SEEN_KEY_PREFIX}${userId}`);
}

export async function getBulkPresence(
  userIds: string[]
): Promise<Map<string, PresenceData | null>> {
  const result = new Map<string, PresenceData | null>();
  if (!isRedisAvailable() || userIds.length === 0) {
    for (const id of userIds) result.set(id, null);
    return result;
  }

  const keys = userIds.map((id) => `${PRESENCE_KEY_PREFIX}${id}`);
  const values = await redisMget<PresenceData>(...keys);

  for (let i = 0; i < userIds.length; i++) {
    result.set(userIds[i], values[i] ?? null);
  }

  return result;
}

export async function storeSession(session: SessionData): Promise<boolean> {
  if (!isRedisAvailable()) return false;
  return redisSet(
    `${SESSION_KEY_PREFIX}${session.userId}:${session.sessionId}`,
    session,
    86400
  );
}

export async function getSession(
  userId: string,
  sessionId: string
): Promise<SessionData | null> {
  return redisGet<SessionData>(`${SESSION_KEY_PREFIX}${userId}:${sessionId}`);
}

export async function removeSession(
  userId: string,
  sessionId: string
): Promise<void> {
  await redisDel(`${SESSION_KEY_PREFIX}${userId}:${sessionId}`);
}
