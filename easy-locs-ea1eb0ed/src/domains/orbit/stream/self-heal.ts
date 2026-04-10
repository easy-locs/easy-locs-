/**
 * Orbit Self-Heal — Detects and fixes stuck/failed messages automatically.
 * Integrates with the existing auto-heal-engine but scoped to Orbit domain.
 */

const STUCK_THRESHOLD_MS = 8_000;
const HEAL_INTERVAL_MS = 3_000;

export interface HealableMessage {
  id: string;
  status: string;
  createdAt: number;
  conversationId: string;
}

type RetryFn = (msg: HealableMessage) => Promise<void>;
type PurgeFn = (msgId: string) => void;
type GetStuckFn = () => HealableMessage[];

let healTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the Orbit self-heal loop.
 */
export function startOrbitSelfHeal(
  getStuckMessages: GetStuckFn,
  retryMessage: RetryFn,
  purgeDuplicate: PurgeFn,
): () => void {
  if (healTimer) clearInterval(healTimer);

  healTimer = setInterval(async () => {
    const stuck = getStuckMessages();
    const now = Date.now();

    for (const msg of stuck) {
      // Stuck sending > threshold → retry
      if (msg.status === "sending" && now - msg.createdAt > STUCK_THRESHOLD_MS) {
        try {
          await retryMessage(msg);
        } catch (err) {
          console.warn(`[orbit-self-heal] Retry failed for ${msg.id}`, err);
        }
      }
    }
  }, HEAL_INTERVAL_MS);

  return () => {
    if (healTimer) {
      clearInterval(healTimer);
      healTimer = null;
    }
  };
}
