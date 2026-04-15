import { Redis } from "npm:@upstash/redis@1.37.0";

let _redis: Redis | null = null;
let _initFailed = false;

export function getRedisClient(): Redis | null {
  if (_initFailed) return null;
  if (_redis) return _redis;

  try {
    const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
    const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

    if (!url || !token) {
      console.warn("[redis-client] Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN — Redis disabled");
      _initFailed = true;
      return null;
    }

    _redis = new Redis({ url, token });
    return _redis;
  } catch (err) {
    console.error("[redis-client] Failed to initialize Redis:", err);
    _initFailed = true;
    return null;
  }
}

export function isRedisAvailable(): boolean {
  return getRedisClient() !== null;
}

export async function redisGet<T = unknown>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get<T>(key);
    return value ?? null;
  } catch (err) {
    console.warn("[redis-client] GET failed for key:", key, err);
    return null;
  }
}

export async function redisSet(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    if (ttlSeconds && ttlSeconds > 0) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (err) {
    console.warn("[redis-client] SET failed for key:", key, err);
    return false;
  }
}

export async function redisDel(...keys: string[]): Promise<number> {
  const client = getRedisClient();
  if (!client || keys.length === 0) return 0;

  try {
    return await client.del(...keys);
  } catch (err) {
    console.warn("[redis-client] DEL failed:", err);
    return 0;
  }
}

export async function redisIncr(key: string): Promise<number | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    return await client.incr(key);
  } catch (err) {
    console.warn("[redis-client] INCR failed for key:", key, err);
    return null;
  }
}

export async function redisExpire(key: string, seconds: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    await client.expire(key, seconds);
    return true;
  } catch (err) {
    console.warn("[redis-client] EXPIRE failed for key:", key, err);
    return false;
  }
}

export async function redisTtl(key: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return -2;

  try {
    return await client.ttl(key);
  } catch (err) {
    console.warn("[redis-client] TTL failed for key:", key, err);
    return -2;
  }
}

export async function redisExists(...keys: string[]): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  try {
    return await client.exists(...keys);
  } catch (err) {
    console.warn("[redis-client] EXISTS failed:", err);
    return 0;
  }
}

export async function redisLpush(key: string, ...values: unknown[]): Promise<number | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    return await client.lpush(key, ...values);
  } catch (err) {
    console.warn("[redis-client] LPUSH failed for key:", key, err);
    return null;
  }
}

export async function redisRpop<T = unknown>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    return await client.rpop<T>(key);
  } catch (err) {
    console.warn("[redis-client] RPOP failed for key:", key, err);
    return null;
  }
}

export async function redisLlen(key: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  try {
    return await client.llen(key);
  } catch (err) {
    console.warn("[redis-client] LLEN failed for key:", key, err);
    return 0;
  }
}

export async function redisMget<T = unknown>(...keys: string[]): Promise<(T | null)[]> {
  const client = getRedisClient();
  if (!client) return keys.map(() => null);

  try {
    return await client.mget<(T | null)[]>(...keys);
  } catch (err) {
    console.warn("[redis-client] MGET failed:", err);
    return keys.map(() => null);
  }
}

export async function redisPing(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const result = await client.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}
