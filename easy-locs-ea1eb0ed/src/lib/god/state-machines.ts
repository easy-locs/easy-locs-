export interface StateTransition {
  from: string;
  to: string;
  guard?: string;
  action?: string;
}

export interface StateMachineDefinition {
  id: string;
  name: string;
  domain: string;
  initial: string;
  terminal: string[];
  states: string[];
  transitions: StateTransition[];
}

export interface TransitionResult {
  allowed: boolean;
  from: string;
  to: string;
  machine: string;
  error?: string;
  guard?: string;
}

export interface StateMachineAuditResult {
  machine: string;
  valid: boolean;
  unreachableStates: string[];
  deadEndStates: string[];
  missingTerminal: boolean;
  circularPaths: string[][];
  issues: string[];
}

const LISTING_MACHINE: StateMachineDefinition = {
  id: "listing",
  name: "Listing Lifecycle",
  domain: "marketplace",
  initial: "draft",
  terminal: ["archived"],
  states: ["draft", "pending_review", "validated", "published", "suspended", "archived"],
  transitions: [
    { from: "draft", to: "pending_review", action: "submit" },
    { from: "pending_review", to: "validated", action: "approve" },
    { from: "pending_review", to: "draft", action: "reject" },
    { from: "validated", to: "published", action: "publish" },
    { from: "published", to: "suspended", action: "suspend" },
    { from: "suspended", to: "published", action: "reactivate" },
    { from: "published", to: "archived", action: "archive" },
    { from: "suspended", to: "archived", action: "archive" },
    { from: "draft", to: "archived", action: "discard" },
  ],
};

const ORDER_MACHINE: StateMachineDefinition = {
  id: "order",
  name: "Order Lifecycle",
  domain: "marketplace",
  initial: "created",
  terminal: ["completed", "cancelled", "refunded"],
  states: ["created", "priced", "paid", "accepted", "preparing", "picked_up", "delivered", "completed", "cancelled", "refunded"],
  transitions: [
    { from: "created", to: "priced", action: "price" },
    { from: "priced", to: "paid", action: "pay" },
    { from: "paid", to: "accepted", action: "accept" },
    { from: "accepted", to: "preparing", action: "start_prep" },
    { from: "preparing", to: "picked_up", action: "pickup" },
    { from: "picked_up", to: "delivered", action: "deliver" },
    { from: "delivered", to: "completed", action: "complete" },
    { from: "created", to: "cancelled", action: "cancel" },
    { from: "priced", to: "cancelled", action: "cancel" },
    { from: "paid", to: "refunded", action: "refund" },
    { from: "accepted", to: "cancelled", action: "cancel" },
  ],
};

const BOOKING_MACHINE: StateMachineDefinition = {
  id: "booking",
  name: "Booking Lifecycle",
  domain: "booking",
  initial: "created",
  terminal: ["completed", "expired", "cancelled"],
  states: ["created", "pending_payment", "confirmed", "active", "completed", "expired", "cancelled"],
  transitions: [
    { from: "created", to: "pending_payment", action: "request_payment" },
    { from: "pending_payment", to: "confirmed", action: "confirm_payment" },
    { from: "confirmed", to: "active", action: "check_in" },
    { from: "active", to: "completed", action: "check_out" },
    { from: "created", to: "expired", action: "expire" },
    { from: "pending_payment", to: "expired", action: "expire" },
    { from: "confirmed", to: "cancelled", action: "cancel" },
    { from: "created", to: "cancelled", action: "cancel" },
  ],
};

const PAYMENT_MACHINE: StateMachineDefinition = {
  id: "payment",
  name: "Payment Lifecycle",
  domain: "wallet",
  initial: "initiated",
  terminal: ["settled", "failed", "voided", "refunded"],
  states: ["initiated", "processing", "authorized", "captured", "settled", "failed", "voided", "refunded"],
  transitions: [
    { from: "initiated", to: "processing", action: "process" },
    { from: "processing", to: "authorized", action: "authorize" },
    { from: "processing", to: "failed", action: "fail" },
    { from: "authorized", to: "captured", action: "capture" },
    { from: "authorized", to: "voided", action: "void" },
    { from: "captured", to: "settled", action: "settle" },
    { from: "captured", to: "refunded", action: "refund" },
  ],
};

const DELIVERY_MACHINE: StateMachineDefinition = {
  id: "delivery",
  name: "Delivery Job Lifecycle",
  domain: "delivery",
  initial: "created",
  terminal: ["delivered", "cancelled", "failed"],
  states: ["created", "assigned", "accepted", "en_route_pickup", "picked_up", "en_route_dropoff", "delivered", "cancelled", "failed"],
  transitions: [
    { from: "created", to: "assigned", action: "assign" },
    { from: "assigned", to: "accepted", action: "accept" },
    { from: "assigned", to: "cancelled", action: "reject" },
    { from: "accepted", to: "en_route_pickup", action: "head_to_pickup" },
    { from: "en_route_pickup", to: "picked_up", action: "confirm_pickup" },
    { from: "picked_up", to: "en_route_dropoff", action: "head_to_dropoff" },
    { from: "en_route_dropoff", to: "delivered", action: "confirm_delivery" },
    { from: "created", to: "cancelled", action: "cancel" },
    { from: "accepted", to: "failed", action: "fail" },
    { from: "en_route_pickup", to: "failed", action: "fail" },
  ],
};

const MESSAGE_MACHINE: StateMachineDefinition = {
  id: "message",
  name: "Message Lifecycle",
  domain: "orbit",
  initial: "draft",
  terminal: ["read", "failed"],
  states: ["draft", "queued", "sent", "delivered", "read", "failed"],
  transitions: [
    { from: "draft", to: "queued", action: "send" },
    { from: "queued", to: "sent", action: "transmit" },
    { from: "queued", to: "failed", action: "fail" },
    { from: "sent", to: "delivered", action: "deliver" },
    { from: "delivered", to: "read", action: "read" },
  ],
};

const CALL_MACHINE: StateMachineDefinition = {
  id: "call",
  name: "Call Session Lifecycle",
  domain: "orbit",
  initial: "initiated",
  terminal: ["ended", "failed", "missed"],
  states: ["initiated", "ringing", "connected", "ended", "failed", "missed"],
  transitions: [
    { from: "initiated", to: "ringing", action: "ring" },
    { from: "initiated", to: "failed", action: "fail" },
    { from: "ringing", to: "connected", action: "answer" },
    { from: "ringing", to: "missed", action: "miss" },
    { from: "ringing", to: "failed", action: "fail" },
    { from: "connected", to: "ended", action: "hangup" },
  ],
};

const AD_CAMPAIGN_MACHINE: StateMachineDefinition = {
  id: "ad_campaign",
  name: "Ad Campaign Lifecycle",
  domain: "media",
  initial: "draft",
  terminal: ["expired", "cancelled"],
  states: ["draft", "approved", "scheduled", "live", "paused", "expired", "cancelled"],
  transitions: [
    { from: "draft", to: "approved", action: "approve" },
    { from: "draft", to: "cancelled", action: "cancel" },
    { from: "approved", to: "scheduled", action: "schedule" },
    { from: "scheduled", to: "live", action: "go_live" },
    { from: "live", to: "paused", action: "pause" },
    { from: "paused", to: "live", action: "resume" },
    { from: "live", to: "expired", action: "expire" },
    { from: "paused", to: "expired", action: "expire" },
    { from: "scheduled", to: "cancelled", action: "cancel" },
  ],
};

export const STATE_MACHINES: Record<string, StateMachineDefinition> = {
  listing: LISTING_MACHINE,
  order: ORDER_MACHINE,
  booking: BOOKING_MACHINE,
  payment: PAYMENT_MACHINE,
  delivery: DELIVERY_MACHINE,
  message: MESSAGE_MACHINE,
  call: CALL_MACHINE,
  ad_campaign: AD_CAMPAIGN_MACHINE,
};

class StateMachineEngine {
  private machines: Record<string, StateMachineDefinition>;
  private transitionLog: Array<{
    timestamp: number;
    machine: string;
    entityId: string;
    from: string;
    to: string;
    action?: string;
  }> = [];

  constructor() {
    this.machines = { ...STATE_MACHINES };
  }

  canTransition(machineId: string, from: string, to: string): TransitionResult {
    const machine = this.machines[machineId];
    if (!machine) {
      return { allowed: false, from, to, machine: machineId, error: `Unknown machine: ${machineId}` };
    }

    if (!machine.states.includes(from)) {
      return { allowed: false, from, to, machine: machineId, error: `Invalid source state: ${from}` };
    }

    if (!machine.states.includes(to)) {
      return { allowed: false, from, to, machine: machineId, error: `Invalid target state: ${to}` };
    }

    const transition = machine.transitions.find(
      (t) => t.from === from && t.to === to
    );

    if (!transition) {
      return {
        allowed: false,
        from,
        to,
        machine: machineId,
        error: `No transition from "${from}" to "${to}" in ${machineId}`,
      };
    }

    return { allowed: true, from, to, machine: machineId };
  }

  recordTransition(
    machineId: string,
    entityId: string,
    from: string,
    to: string,
    action?: string
  ): TransitionResult {
    const result = this.canTransition(machineId, from, to);
    if (result.allowed) {
      this.transitionLog.push({
        timestamp: Date.now(),
        machine: machineId,
        entityId,
        from,
        to,
        action,
      });
      if (this.transitionLog.length > 10_000) {
        this.transitionLog = this.transitionLog.slice(-5_000);
      }
    }
    return result;
  }

  getValidTransitions(machineId: string, currentState: string): string[] {
    const machine = this.machines[machineId];
    if (!machine) return [];
    return machine.transitions
      .filter((t) => t.from === currentState)
      .map((t) => t.to);
  }

  auditMachine(machineId: string): StateMachineAuditResult {
    const machine = this.machines[machineId];
    if (!machine) {
      return {
        machine: machineId,
        valid: false,
        unreachableStates: [],
        deadEndStates: [],
        missingTerminal: true,
        circularPaths: [],
        issues: [`Machine "${machineId}" not found`],
      };
    }

    const issues: string[] = [];
    const reachable = new Set<string>([machine.initial]);
    const queue = [machine.initial];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const targets = machine.transitions
        .filter((t) => t.from === current)
        .map((t) => t.to);
      for (const t of targets) {
        if (!reachable.has(t)) {
          reachable.add(t);
          queue.push(t);
        }
      }
    }

    const unreachableStates = machine.states.filter((s) => !reachable.has(s));
    if (unreachableStates.length > 0) {
      issues.push(`Unreachable states: ${unreachableStates.join(", ")}`);
    }

    const deadEndStates = machine.states.filter((s) => {
      if (machine.terminal.includes(s)) return false;
      return !machine.transitions.some((t) => t.from === s);
    });
    if (deadEndStates.length > 0) {
      issues.push(`Non-terminal dead-end states: ${deadEndStates.join(", ")}`);
    }

    const missingTerminal = machine.terminal.some(
      (t) => !machine.states.includes(t)
    );
    if (missingTerminal) {
      issues.push("Terminal state(s) not in states list");
    }

    return {
      machine: machineId,
      valid: issues.length === 0,
      unreachableStates,
      deadEndStates,
      missingTerminal,
      circularPaths: [],
      issues,
    };
  }

  auditAll(): StateMachineAuditResult[] {
    return Object.keys(this.machines).map((id) => this.auditMachine(id));
  }

  getMachine(id: string): StateMachineDefinition | undefined {
    return this.machines[id];
  }

  getAllMachineIds(): string[] {
    return Object.keys(this.machines);
  }

  getTransitionLog(machineId?: string, limit = 100) {
    const filtered = machineId
      ? this.transitionLog.filter((l) => l.machine === machineId)
      : this.transitionLog;
    return filtered.slice(-limit);
  }
}

export const stateMachineEngine = new StateMachineEngine();
