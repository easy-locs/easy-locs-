import { platformBus } from "@/lib/shared/platform-bus";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  failureWindowMs: number;
  cooldownMs: number;
  successThresholdForClose: number;
}

export interface DomainCircuitState {
  domain: string;
  state: CircuitState;
  failures: number[];
  successCountInHalfOpen: number;
  openedAt: number | null;
  lastFailureAt: number | null;
  deadLetterQueue: Array<{ type: string; payload: unknown; timestamp: number }>;
  totalTripped: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureWindowMs: 30_000,
  cooldownMs: 60_000,
  successThresholdForClose: 3,
};

const MAX_DEAD_LETTER_PER_DOMAIN = 100;

class DomainCircuitBreakerManager {
  private circuits = new Map<string, DomainCircuitState>();
  private config: CircuitBreakerConfig;
  private _installed = false;
  private _unsub: (() => void) | null = null;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getOrCreate(domain: string): DomainCircuitState {
    if (!this.circuits.has(domain)) {
      this.circuits.set(domain, {
        domain,
        state: "CLOSED",
        failures: [],
        successCountInHalfOpen: 0,
        openedAt: null,
        lastFailureAt: null,
        deadLetterQueue: [],
        totalTripped: 0,
      });
    }
    return this.circuits.get(domain)!;
  }

  private extractDomain(eventType: string): string | null {
    const sep = eventType.includes(":") ? ":" : ".";
    const prefix = eventType.split(sep)[0]?.toLowerCase();
    return prefix || null;
  }

  private pruneFailures(circuit: DomainCircuitState): void {
    const cutoff = Date.now() - this.config.failureWindowMs;
    circuit.failures = circuit.failures.filter((t) => t > cutoff);
  }

  private tryTransitionToHalfOpen(circuit: DomainCircuitState): boolean {
    if (circuit.state !== "OPEN" || !circuit.openedAt) return false;
    if (Date.now() - circuit.openedAt >= this.config.cooldownMs) {
      circuit.state = "HALF_OPEN";
      circuit.successCountInHalfOpen = 0;
      platformBus.emit(
        "system:circuit_breaker:half_open",
        { domain: circuit.domain },
        "system",
      );
      return true;
    }
    return false;
  }

  recordFailure(domain: string): void {
    const circuit = this.getOrCreate(domain);
    const now = Date.now();

    if (circuit.state === "HALF_OPEN") {
      circuit.state = "OPEN";
      circuit.openedAt = now;
      circuit.successCountInHalfOpen = 0;
      circuit.totalTripped++;
      platformBus.emit(
        "system:circuit_breaker:open",
        { domain, reason: "failure_in_half_open" },
        "system",
      );
      return;
    }

    circuit.failures.push(now);
    circuit.lastFailureAt = now;
    this.pruneFailures(circuit);

    if (
      circuit.state === "CLOSED" &&
      circuit.failures.length >= this.config.failureThreshold
    ) {
      circuit.state = "OPEN";
      circuit.openedAt = now;
      circuit.totalTripped++;
      platformBus.emit(
        "system:circuit_breaker:open",
        {
          domain,
          failureCount: circuit.failures.length,
          reason: "threshold_exceeded",
        },
        "system",
      );
    }
  }

  recordSuccess(domain: string): void {
    const circuit = this.getOrCreate(domain);

    if (circuit.state === "HALF_OPEN") {
      circuit.successCountInHalfOpen++;
      if (
        circuit.successCountInHalfOpen >= this.config.successThresholdForClose
      ) {
        circuit.state = "CLOSED";
        circuit.failures = [];
        circuit.openedAt = null;
        circuit.successCountInHalfOpen = 0;
        platformBus.emit(
          "system:circuit_breaker:closed",
          { domain },
          "system",
        );
      }
    }
  }

  canDispatch(eventType: string, eventPayload?: unknown): boolean {
    const domain = this.extractDomain(eventType);
    if (!domain) return true;

    const circuit = this.circuits.get(domain);
    if (!circuit) return true;

    if (circuit.state === "OPEN") {
      this.tryTransitionToHalfOpen(circuit);
    }

    if (circuit.state === "OPEN") {
      if (circuit.deadLetterQueue.length < MAX_DEAD_LETTER_PER_DOMAIN) {
        circuit.deadLetterQueue.push({
          type: eventType,
          payload: eventPayload ?? null,
          timestamp: Date.now(),
        });
      }
      return false;
    }

    return true;
  }

  getCircuitState(domain: string): DomainCircuitState | undefined {
    const circuit = this.circuits.get(domain);
    if (circuit && circuit.state === "OPEN") {
      this.tryTransitionToHalfOpen(circuit);
    }
    return circuit;
  }

  getAllCircuits(): DomainCircuitState[] {
    return Array.from(this.circuits.values()).map((c) => {
      if (c.state === "OPEN") this.tryTransitionToHalfOpen(c);
      return c;
    });
  }

  getDeadLetterQueue(
    domain: string,
  ): Array<{ type: string; payload: unknown; timestamp: number }> {
    return this.circuits.get(domain)?.deadLetterQueue ?? [];
  }

  drainDeadLetterQueue(domain: string): void {
    const circuit = this.circuits.get(domain);
    if (circuit) circuit.deadLetterQueue = [];
  }

  forceClose(domain: string): void {
    const circuit = this.getOrCreate(domain);
    circuit.state = "CLOSED";
    circuit.failures = [];
    circuit.openedAt = null;
    circuit.successCountInHalfOpen = 0;
  }

  forceOpen(domain: string): void {
    const circuit = this.getOrCreate(domain);
    circuit.state = "OPEN";
    circuit.openedAt = Date.now();
    circuit.totalTripped++;
  }

  install(): () => void {
    if (this._installed) return () => {};
    this._installed = true;

    this._unsub = platformBus.onAll((event) => {
      const domain = this.extractDomain(event.type);
      if (!domain) return;

      const circuit = this.circuits.get(domain);
      if (!circuit) return;

      if (circuit.state === "OPEN") {
        this.tryTransitionToHalfOpen(circuit);
      }
    });

    return () => {
      this._installed = false;
      this._unsub?.();
      this._unsub = null;
    };
  }

  reset(): void {
    this.circuits.clear();
  }

  getReport(): {
    totalCircuits: number;
    openCircuits: string[];
    halfOpenCircuits: string[];
    closedCircuits: string[];
    totalDeadLetters: number;
    circuitDetails: DomainCircuitState[];
  } {
    const circuits = this.getAllCircuits();
    return {
      totalCircuits: circuits.length,
      openCircuits: circuits
        .filter((c) => c.state === "OPEN")
        .map((c) => c.domain),
      halfOpenCircuits: circuits
        .filter((c) => c.state === "HALF_OPEN")
        .map((c) => c.domain),
      closedCircuits: circuits
        .filter((c) => c.state === "CLOSED")
        .map((c) => c.domain),
      totalDeadLetters: circuits.reduce(
        (sum, c) => sum + c.deadLetterQueue.length,
        0,
      ),
      circuitDetails: circuits,
    };
  }
}

export const domainCircuitBreaker = new DomainCircuitBreakerManager();
