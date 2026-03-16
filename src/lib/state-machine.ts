/**
 * State Machine Engine — PASS55 Block AW
 * Finite state machines, workflow engine, status transitions.
 */

// ─── Types ──────────────────────────────────────────────────────────────
export interface StateTransition<S extends string, E extends string> {
  from: S;
  to: S;
  event: E;
  guard?: () => boolean;
  action?: () => void;
}

export interface StateMachineConfig<S extends string, E extends string> {
  id: string;
  initial: S;
  states: S[];
  transitions: StateTransition<S, E>[];
  onEnter?: Partial<Record<S, () => void>>;
  onExit?: Partial<Record<S, () => void>>;
}

export type MachineListener<S extends string> = (state: S, prev: S) => void;

// ─── State Machine ──────────────────────────────────────────────────────
export class StateMachine<S extends string, E extends string> {
  private _state: S;
  private listeners: MachineListener<S>[] = [];
  private history: { from: S; to: S; event: E; at: number }[] = [];

  constructor(private config: StateMachineConfig<S, E>) {
    this._state = config.initial;
  }

  get state(): S { return this._state; }
  get id(): string { return this.config.id; }

  /** Send an event to the machine. Returns true if transition occurred. */
  send(event: E): boolean {
    const transition = this.config.transitions.find(
      t => t.from === this._state && t.event === event,
    );
    if (!transition) return false;
    if (transition.guard && !transition.guard()) return false;

    const prev = this._state;
    this.config.onExit?.[prev]?.();
    transition.action?.();
    this._state = transition.to;
    this.config.onEnter?.[transition.to]?.();
    this.history.push({ from: prev, to: this._state, event, at: Date.now() });
    this.listeners.forEach(fn => fn(this._state, prev));
    return true;
  }

  /** Check if an event can be sent from the current state */
  can(event: E): boolean {
    return this.config.transitions.some(
      t => t.from === this._state && t.event === event && (!t.guard || t.guard()),
    );
  }

  /** Get all available events from the current state */
  availableEvents(): E[] {
    return this.config.transitions
      .filter(t => t.from === this._state && (!t.guard || t.guard()))
      .map(t => t.event);
  }

  /** Subscribe to state changes */
  subscribe(listener: MachineListener<S>): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  getHistory() { return [...this.history]; }

  /** Reset to initial state */
  reset() {
    const prev = this._state;
    this._state = this.config.initial;
    this.history = [];
    this.listeners.forEach(fn => fn(this._state, prev));
  }

  /** Matches current state against one or more states */
  matches(...states: S[]): boolean {
    return states.includes(this._state);
  }
}

// ─── Workflow Engine (multi-step orchestration) ─────────────────────────
export interface WorkflowStep<C = unknown> {
  id: string;
  execute: (ctx: C) => Promise<C>;
  rollback?: (ctx: C) => Promise<C>;
  retries?: number;
}

export interface WorkflowResult<C> {
  success: boolean;
  context: C;
  completedSteps: string[];
  failedStep?: string;
  error?: Error;
}

export async function runWorkflow<C>(
  steps: WorkflowStep<C>[],
  initialContext: C,
): Promise<WorkflowResult<C>> {
  let ctx = initialContext;
  const completed: string[] = [];

  for (const step of steps) {
    let attempts = 0;
    const maxRetries = step.retries ?? 0;
    let lastError: Error | undefined;

    while (attempts <= maxRetries) {
      try {
        ctx = await step.execute(ctx);
        completed.push(step.id);
        lastError = undefined;
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        attempts++;
      }
    }

    if (lastError) {
      // Rollback completed steps in reverse
      for (const id of [...completed].reverse()) {
        const s = steps.find(st => st.id === id);
        if (s?.rollback) {
          try { ctx = await s.rollback(ctx); } catch { /* best effort */ }
        }
      }
      return { success: false, context: ctx, completedSteps: completed, failedStep: step.id, error: lastError };
    }
  }

  return { success: true, context: ctx, completedSteps: completed };
}

// ─── Predefined domain machines ─────────────────────────────────────────
export type LeaseStatus = "draft" | "pending" | "active" | "terminated" | "expired";
export type LeaseEvent = "submit" | "approve" | "terminate" | "expire" | "reactivate";

export function createLeaseMachine(): StateMachine<LeaseStatus, LeaseEvent> {
  return new StateMachine({
    id: "lease",
    initial: "draft",
    states: ["draft", "pending", "active", "terminated", "expired"],
    transitions: [
      { from: "draft", to: "pending", event: "submit" },
      { from: "pending", to: "active", event: "approve" },
      { from: "active", to: "terminated", event: "terminate" },
      { from: "active", to: "expired", event: "expire" },
      { from: "terminated", to: "active", event: "reactivate" },
    ],
  });
}

export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";
export type PaymentEvent = "process" | "complete" | "fail" | "refund" | "retry";

export function createPaymentMachine(): StateMachine<PaymentStatus, PaymentEvent> {
  return new StateMachine({
    id: "payment",
    initial: "pending",
    states: ["pending", "processing", "completed", "failed", "refunded"],
    transitions: [
      { from: "pending", to: "processing", event: "process" },
      { from: "processing", to: "completed", event: "complete" },
      { from: "processing", to: "failed", event: "fail" },
      { from: "completed", to: "refunded", event: "refund" },
      { from: "failed", to: "processing", event: "retry" },
    ],
  });
}
