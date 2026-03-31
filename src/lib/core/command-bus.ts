/**
 * Command Bus — Typed, idempotent command dispatch layer.
 * Sits between UI intents and atomic services.
 *
 * Features:
 * - Typed command contracts
 * - Idempotency guard (requestId-based deduplication)
 * - Flow gate integration
 * - Event emission after execution
 *
 * RULE: All write operations must pass through commandBus.execute().
 * No component/page may call atomic services directly.
 */

import { eventBus } from "@/lib/core/event-bus";

// ── Command Base ──

export interface CommandBase {
  /** Unique per-invocation ID for idempotency */
  requestId: string;
  /** Actor performing the command */
  actorId: string;
  /** ISO timestamp */
  timestamp: string;
  /** Optional entity scope */
  conversationId?: string;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId: string;
}

// ── Idempotency Guard ──

const IDEM_TTL = 5000; // 5s dedup window
const executedCommands = new Map<string, number>();

function isIdempotent(requestId: string): boolean {
  const now = Date.now();
  const last = executedCommands.get(requestId);
  if (last && now - last < IDEM_TTL) return true;
  executedCommands.set(requestId, now);

  // Cleanup old entries
  if (executedCommands.size > 1000) {
    const cutoff = now - IDEM_TTL * 2;
    for (const [k, ts] of executedCommands) {
      if (ts < cutoff) executedCommands.delete(k);
    }
  }
  return false;
}

// ── Command Handler Registry ──

type CommandHandler<C extends CommandBase, R = unknown> = (cmd: C) => Promise<CommandResult<R>>;

const handlers = new Map<string, CommandHandler<any, any>>();

// ── Command Bus ──

export const commandBus = {
  /**
   * Register a handler for a command type.
   * Only one handler per command type (single owner).
   */
  register<C extends CommandBase, R = unknown>(
    commandType: string,
    handler: CommandHandler<C, R>,
  ): void {
    if (handlers.has(commandType) && import.meta.env.DEV) {
      console.warn(`[command-bus] Overwriting handler for ${commandType}`);
    }
    handlers.set(commandType, handler);
  },

  /**
   * Execute a command through the bus.
   * - Checks idempotency
   * - Delegates to registered handler
   * - Emits result event
   */
  async execute<C extends CommandBase, R = unknown>(
    commandType: string,
    cmd: C,
  ): Promise<CommandResult<R>> {
    // Idempotency guard
    if (isIdempotent(cmd.requestId)) {
      if (import.meta.env.DEV) {
        console.log(`[command-bus] Idempotent skip: ${commandType} (${cmd.requestId})`);
      }
      return { success: false, error: "idempotent_skip", requestId: cmd.requestId };
    }

    const handler = handlers.get(commandType);
    if (!handler) {
      console.error(`[command-bus] No handler registered for: ${commandType}`);
      return { success: false, error: "no_handler", requestId: cmd.requestId };
    }

    if (import.meta.env.DEV) {
      console.log(`[command-bus] Executing: ${commandType}`, cmd.requestId);
    }

    try {
      const result = await handler(cmd);

      // Emit event
      const eventName = commandType.replace(".command.", ".event.");
      eventBus.emit(
        result.success ? eventName.replace(/\.\w+$/, ".completed") : eventName.replace(/\.\w+$/, ".failed"),
        { commandType, requestId: cmd.requestId, result } as any,
      );

      return result;
    } catch (err: any) {
      console.error(`[command-bus] Error in ${commandType}:`, err);
      return { success: false, error: err.message || "unknown", requestId: cmd.requestId };
    }
  },

  /** Check if a command type has a registered handler */
  hasHandler(commandType: string): boolean {
    return handlers.has(commandType);
  },
};

// ── Helper: generate unique request ID ──
export function createRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
