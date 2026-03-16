/**
 * State Machine Engine — AW Block
 * Typed finite state machines with guards, effects, and history.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export interface Transition<S extends string, E extends string, C = any> {
  from: S | S[];
  event: E;
  to: S;
  guard?: (context: C) => boolean;
  effect?: (context: C) => C;
}

export interface MachineConfig<S extends string, E extends string, C = any> {
  id: string;
  initial: S;
  context: C;
  transitions: Transition<S, E, C>[];
  onEnter?: Partial<Record<S, (ctx: C) => void>>;
  onExit?: Partial<Record<S, (ctx: C) => void>>;
}

export interface MachineState<S extends string, C = any> {
  current: S;
  context: C;
  history: S[];
}

export type MachineListener<S extends string, C = any> = (state: MachineState<S, C>) => void;

// ── State Machine ───────────────────────────────────────────────────────────

export class StateMachine<S extends string, E extends string, C = any> {
  private state: MachineState<S, C>;
  private config: MachineConfig<S, E, C>;
  private listeners: Set<MachineListener<S, C>> = new Set();

  constructor(config: MachineConfig<S, E, C>) {
    this.config = config;
    this.state = {
      current: config.initial,
      context: { ...config.context },
      history: [config.initial],
    };
  }

  get current(): S {
    return this.state.current;
  }

  get context(): C {
    return this.state.context;
  }

  get history(): S[] {
    return [...this.state.history];
  }

  getSnapshot(): MachineState<S, C> {
    return { ...this.state, history: [...this.state.history] };
  }

  /** Send an event to transition the machine */
  send(event: E): boolean {
    const transition = this.config.transitions.find((t) => {
      const froms = Array.isArray(t.from) ? t.from : [t.from];
      return froms.includes(this.state.current) && t.event === event;
    });

    if (!transition) return false;

    // Check guard
    if (transition.guard && !transition.guard(this.state.context)) {
      return false;
    }

    const prevState = this.state.current;

    // Exit callback
    this.config.onExit?.[prevState]?.(this.state.context);

    // Apply effect
    if (transition.effect) {
      this.state.context = transition.effect(this.state.context);
    }

    // Transition
    this.state.current = transition.to;
    this.state.history.push(transition.to);

    // Enter callback
    this.config.onEnter?.[transition.to]?.(this.state.context);

    // Notify listeners
    this.notify();
    return true;
  }

  /** Check if an event can be sent */
  can(event: E): boolean {
    return this.config.transitions.some((t) => {
      const froms = Array.isArray(t.from) ? t.from : [t.from];
      return froms.includes(this.state.current) && t.event === event &&
        (!t.guard || t.guard(this.state.context));
    });
  }

  /** Get all valid events from current state */
  allowedEvents(): E[] {
    return this.config.transitions
      .filter((t) => {
        const froms = Array.isArray(t.from) ? t.from : [t.from];
        return froms.includes(this.state.current) &&
          (!t.guard || t.guard(this.state.context));
      })
      .map((t) => t.event);
  }

  /** Subscribe to state changes */
  subscribe(listener: MachineListener<S, C>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Reset to initial state */
  reset(): void {
    this.state = {
      current: this.config.initial,
      context: { ...this.config.context },
      history: [this.config.initial],
    };
    this.notify();
  }

  /** Update context without transitioning */
  updateContext(updater: (ctx: C) => C): void {
    this.state.context = updater(this.state.context);
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((fn) => fn(snapshot));
  }
}

// ── Workflow Engine (multi-step) ────────────────────────────────────────────

export interface WorkflowStep<C = any> {
  id: string;
  execute: (context: C) => Promise<C>;
  compensate?: (context: C) => Promise<C>;
  retries?: number;
}

export interface WorkflowResult<C = any> {
  success: boolean;
  context: C;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
}

export async function executeWorkflow<C>(
  steps: WorkflowStep<C>[],
  initialContext: C
): Promise<WorkflowResult<C>> {
  let context = { ...initialContext };
  const completedSteps: string[] = [];

  for (const step of steps) {
    const maxAttempts = (step.retries ?? 0) + 1;
    let success = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        context = await step.execute(context);
        completedSteps.push(step.id);
        success = true;
        break;
      } catch (err) {
        if (attempt === maxAttempts - 1) {
          // Compensate completed steps in reverse
          for (let i = completedSteps.length - 1; i >= 0; i--) {
            const completedStep = steps.find((s) => s.id === completedSteps[i]);
            if (completedStep?.compensate) {
              try { context = await completedStep.compensate(context); } catch { /* best effort */ }
            }
          }
          return {
            success: false,
            context,
            completedSteps,
            failedStep: step.id,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }
    }

    if (!success) break;
  }

  return { success: true, context, completedSteps };
}
