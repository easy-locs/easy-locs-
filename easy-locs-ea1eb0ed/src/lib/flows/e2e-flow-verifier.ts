import {
  transition,
  MESSAGE_MACHINE,
  CALL_MACHINE,
  UPLOAD_MACHINE,
  CONNECTION_MACHINE,
  NOTIFICATION_MACHINE,
  AUTH_SESSION_MACHINE,
  CHECKOUT_MACHINE,
  ONBOARDING_MACHINE,
  BOOKING_MACHINE,
  SUPPORT_TICKET_MACHINE,
  REPAIR_MACHINE,
  SUBSCRIPTION_MACHINE,
  type CanonicalMachineDef,
} from "@/lib/state-machines/canonical-machines";

interface VerifiableMachine {
  initial: string;
  states: Record<string, { on?: Record<string, string> }>;
}

function widenMachine<S extends string>(m: CanonicalMachineDef<S>): VerifiableMachine {
  const states: Record<string, { on?: Record<string, string> }> = {};
  for (const key of Object.keys(m.states)) {
    const node = m.states[key as S];
    states[key] = node ? { on: node.on ? { ...node.on } : undefined } : {};
  }
  return { initial: m.initial, states };
}

function transitionVerifiable(machine: VerifiableMachine, currentState: string, event: string): string | null {
  const node = machine.states[currentState];
  if (!node?.on) return null;
  const next = node.on[event];
  return next !== undefined ? next : null;
}

export interface FlowStep {
  event: string;
  expectedState: string;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  machine: VerifiableMachine;
  happyPath: FlowStep[];
  errorPaths: Array<{ name: string; steps: FlowStep[] }>;
  terminalStates: string[];
  allowedSelfTransitions?: string[];
}

export interface FlowVerificationResult {
  flowId: string;
  flowName: string;
  passed: boolean;
  happyPathResult: PathResult;
  errorPathResults: PathResult[];
  deadButtons: string[];
  illegalTransitions: string[];
  silentDrops: string[];
  evidence: string[];
  durationMs: number;
}

interface PathResult {
  name: string;
  passed: boolean;
  steps: StepResult[];
  failedAt?: string;
}

interface StepResult {
  event: string;
  fromState: string;
  expectedState: string;
  actualState: string | null;
  passed: boolean;
}

export interface E2EVerificationReport {
  totalFlows: number;
  passed: number;
  failed: number;
  flowResults: FlowVerificationResult[];
  deadButtonsTotal: number;
  illegalTransitionsTotal: number;
  silentDropsTotal: number;
  timestamp: string;
  durationMs: number;
}

const LEGITIMATE_SELF_TRANSITION_EVENTS = new Set([
  "PROGRESS",
  "BOOKMARK",
  "REASSIGN",
  "RETRY",
  "REFRESH",
  "PING",
  "HEARTBEAT",
  "UPDATE",
]);

const CRITICAL_FLOWS: FlowDefinition[] = [
  {
    id: "login-session",
    name: "Login → Session",
    description: "User authenticates and establishes a session",
    machine: widenMachine(AUTH_SESSION_MACHINE),
    happyPath: [
      { event: "LOGIN", expectedState: "authenticating" },
      { event: "SUCCESS", expectedState: "authenticated" },
    ],
    errorPaths: [
      { name: "login-fail", steps: [{ event: "LOGIN", expectedState: "authenticating" }, { event: "FAIL", expectedState: "anonymous" }] },
      { name: "mfa-flow", steps: [{ event: "LOGIN", expectedState: "authenticating" }, { event: "MFA", expectedState: "mfa_required" }, { event: "VERIFY", expectedState: "authenticated" }] },
      { name: "session-expire", steps: [{ event: "LOGIN", expectedState: "authenticating" }, { event: "SUCCESS", expectedState: "authenticated" }, { event: "EXPIRE", expectedState: "expired" }] },
    ],
    terminalStates: [],
  },
  {
    id: "session-refresh",
    name: "Session Refresh",
    description: "Token refresh cycle",
    machine: widenMachine(AUTH_SESSION_MACHINE),
    happyPath: [
      { event: "LOGIN", expectedState: "authenticating" },
      { event: "SUCCESS", expectedState: "authenticated" },
      { event: "REFRESH", expectedState: "refreshing" },
      { event: "SUCCESS", expectedState: "authenticated" },
    ],
    errorPaths: [
      { name: "refresh-fail", steps: [{ event: "LOGIN", expectedState: "authenticating" }, { event: "SUCCESS", expectedState: "authenticated" }, { event: "REFRESH", expectedState: "refreshing" }, { event: "FAIL", expectedState: "expired" }] },
    ],
    terminalStates: [],
  },
  {
    id: "message-send",
    name: "Message Send Flow",
    description: "Draft → Send → Deliver → Read",
    machine: widenMachine(MESSAGE_MACHINE),
    happyPath: [
      { event: "SEND", expectedState: "sending" },
      { event: "ACK", expectedState: "sent" },
      { event: "DELIVER", expectedState: "delivered" },
      { event: "READ", expectedState: "read" },
    ],
    errorPaths: [
      { name: "send-fail-retry", steps: [{ event: "SEND", expectedState: "sending" }, { event: "FAIL", expectedState: "failed" }, { event: "RETRY", expectedState: "retrying" }, { event: "ACK", expectedState: "sent" }] },
    ],
    terminalStates: ["read"],
  },
  {
    id: "voice-call",
    name: "Voice Call Flow",
    description: "Initiate → Ring → Connect → Active → End",
    machine: widenMachine(CALL_MACHINE),
    happyPath: [
      { event: "INITIATE", expectedState: "calling" },
      { event: "RING", expectedState: "ringing" },
      { event: "ACCEPT", expectedState: "connecting" },
      { event: "CONNECTED", expectedState: "active" },
      { event: "HANGUP", expectedState: "ended" },
    ],
    errorPaths: [
      { name: "call-missed", steps: [{ event: "INITIATE", expectedState: "calling" }, { event: "RING", expectedState: "ringing" }, { event: "TIMEOUT", expectedState: "missed" }] },
      { name: "call-declined", steps: [{ event: "INITIATE", expectedState: "calling" }, { event: "RING", expectedState: "ringing" }, { event: "DECLINE", expectedState: "declined" }] },
      { name: "call-reconnect", steps: [{ event: "INITIATE", expectedState: "calling" }, { event: "RING", expectedState: "ringing" }, { event: "ACCEPT", expectedState: "connecting" }, { event: "CONNECTED", expectedState: "active" }, { event: "DISCONNECT", expectedState: "reconnecting" }, { event: "RECONNECTED", expectedState: "active" }] },
    ],
    terminalStates: ["ended", "missed", "declined"],
  },
  {
    id: "file-upload",
    name: "File Upload Flow",
    description: "Prepare → Upload → Process → Complete",
    machine: widenMachine(UPLOAD_MACHINE),
    happyPath: [
      { event: "START", expectedState: "preparing" },
      { event: "READY", expectedState: "uploading" },
      { event: "DONE", expectedState: "processing" },
      { event: "COMPLETE", expectedState: "completed" },
    ],
    errorPaths: [
      { name: "upload-fail-retry", steps: [{ event: "START", expectedState: "preparing" }, { event: "READY", expectedState: "uploading" }, { event: "FAIL", expectedState: "failed" }, { event: "RETRY", expectedState: "preparing" }] },
      { name: "upload-cancel", steps: [{ event: "START", expectedState: "preparing" }, { event: "READY", expectedState: "uploading" }, { event: "CANCEL", expectedState: "cancelled" }] },
    ],
    terminalStates: ["completed", "cancelled"],
  },
  {
    id: "connection-lifecycle",
    name: "Connection Lifecycle",
    description: "Connect → Connected → Reconnect on drop",
    machine: widenMachine(CONNECTION_MACHINE),
    happyPath: [
      { event: "CONNECT", expectedState: "connecting" },
      { event: "CONNECTED", expectedState: "connected" },
    ],
    errorPaths: [
      { name: "connection-drop-reconnect", steps: [{ event: "CONNECT", expectedState: "connecting" }, { event: "CONNECTED", expectedState: "connected" }, { event: "DROP", expectedState: "reconnecting" }, { event: "CONNECTED", expectedState: "connected" }] },
      { name: "connection-fail-retry", steps: [{ event: "CONNECT", expectedState: "connecting" }, { event: "FAIL", expectedState: "failed" }, { event: "RETRY", expectedState: "connecting" }] },
    ],
    terminalStates: [],
  },
  {
    id: "notification-delivery",
    name: "Notification Delivery",
    description: "Pending → Send → Deliver → Read/Dismiss",
    machine: widenMachine(NOTIFICATION_MACHINE),
    happyPath: [
      { event: "SEND", expectedState: "sent" },
      { event: "DELIVER", expectedState: "delivered" },
      { event: "READ", expectedState: "read" },
    ],
    errorPaths: [
      { name: "notification-dismiss", steps: [{ event: "SEND", expectedState: "sent" }, { event: "DELIVER", expectedState: "delivered" }, { event: "DISMISS", expectedState: "dismissed" }] },
      { name: "notification-fail-retry", steps: [{ event: "SEND", expectedState: "sent" }, { event: "FAIL", expectedState: "failed" }, { event: "RETRY", expectedState: "pending" }] },
    ],
    terminalStates: ["read", "dismissed"],
  },
  {
    id: "checkout-complete",
    name: "Checkout Flow",
    description: "Cart → Address → Payment → Process → Complete",
    machine: widenMachine(CHECKOUT_MACHINE),
    happyPath: [
      { event: "START", expectedState: "cart_review" },
      { event: "PROCEED", expectedState: "address_selection" },
      { event: "CONFIRM_ADDRESS", expectedState: "payment_selection" },
      { event: "CONFIRM_PAYMENT", expectedState: "payment_pending" },
      { event: "PAY", expectedState: "processing" },
      { event: "SUCCESS", expectedState: "completed" },
    ],
    errorPaths: [
      { name: "payment-fail-retry", steps: [{ event: "START", expectedState: "cart_review" }, { event: "PROCEED", expectedState: "address_selection" }, { event: "CONFIRM_ADDRESS", expectedState: "payment_selection" }, { event: "CONFIRM_PAYMENT", expectedState: "payment_pending" }, { event: "PAY", expectedState: "processing" }, { event: "FAIL", expectedState: "failed" }, { event: "RETRY", expectedState: "payment_pending" }] },
      { name: "checkout-cancel", steps: [{ event: "START", expectedState: "cart_review" }, { event: "CANCEL", expectedState: "cancelled" }] },
    ],
    terminalStates: ["completed", "cancelled"],
  },
  {
    id: "onboarding",
    name: "Onboarding Flow",
    description: "Profile → Phone → Identity → Preferences → Tutorial",
    machine: widenMachine(ONBOARDING_MACHINE),
    happyPath: [
      { event: "START", expectedState: "profile_setup" },
      { event: "NEXT", expectedState: "phone_verification" },
      { event: "VERIFY", expectedState: "identity_verification" },
      { event: "VERIFY", expectedState: "preferences" },
      { event: "NEXT", expectedState: "tutorial" },
      { event: "FINISH", expectedState: "completed" },
    ],
    errorPaths: [
      { name: "onboarding-skip", steps: [{ event: "SKIP", expectedState: "skipped" }] },
    ],
    terminalStates: ["completed", "skipped"],
  },
  {
    id: "booking",
    name: "Booking Flow",
    description: "Browse → Select → Confirm → Pay → Complete",
    machine: widenMachine(BOOKING_MACHINE),
    happyPath: [
      { event: "SELECT_SLOT", expectedState: "slot_selected" },
      { event: "CONFIRM", expectedState: "confirming" },
      { event: "REQUIRE_PAYMENT", expectedState: "payment_pending" },
      { event: "PAY", expectedState: "confirmed" },
      { event: "REMIND", expectedState: "reminder_sent" },
      { event: "START", expectedState: "in_progress" },
      { event: "COMPLETE", expectedState: "completed" },
    ],
    errorPaths: [
      { name: "booking-no-show", steps: [{ event: "SELECT_SLOT", expectedState: "slot_selected" }, { event: "CONFIRM", expectedState: "confirming" }, { event: "CONFIRM", expectedState: "confirmed" }, { event: "NO_SHOW", expectedState: "no_show" }] },
      { name: "booking-cancel-refund", steps: [{ event: "SELECT_SLOT", expectedState: "slot_selected" }, { event: "CONFIRM", expectedState: "confirming" }, { event: "CONFIRM", expectedState: "confirmed" }, { event: "CANCEL", expectedState: "cancelled" }, { event: "REFUND", expectedState: "refunded" }] },
    ],
    terminalStates: ["refunded"],
  },
  {
    id: "support-ticket",
    name: "Support Ticket Flow",
    description: "Open → Triage → Assign → Progress → Resolve → Close",
    machine: widenMachine(SUPPORT_TICKET_MACHINE),
    happyPath: [
      { event: "TRIAGE", expectedState: "triaged" },
      { event: "ASSIGN", expectedState: "assigned" },
      { event: "START", expectedState: "in_progress" },
      { event: "RESOLVE", expectedState: "resolved" },
      { event: "CLOSE", expectedState: "closed" },
    ],
    errorPaths: [
      { name: "ticket-escalate", steps: [{ event: "TRIAGE", expectedState: "triaged" }, { event: "ESCALATE", expectedState: "escalated" }, { event: "ASSIGN", expectedState: "assigned" }] },
    ],
    terminalStates: ["closed"],
    allowedSelfTransitions: ["REASSIGN"],
  },
  {
    id: "repair-lifecycle",
    name: "Repair Lifecycle",
    description: "Report → Diagnose → Quote → Repair → QC → Invoice → Pay",
    machine: widenMachine(REPAIR_MACHINE),
    happyPath: [
      { event: "ACKNOWLEDGE", expectedState: "acknowledged" },
      { event: "DIAGNOSE", expectedState: "diagnosed" },
      { event: "SEND_QUOTE", expectedState: "quote_sent" },
      { event: "APPROVE_QUOTE", expectedState: "quote_approved" },
      { event: "ORDER_PARTS", expectedState: "parts_ordered" },
      { event: "RECEIVE_PARTS", expectedState: "parts_received" },
      { event: "START_REPAIR", expectedState: "in_repair" },
      { event: "QC", expectedState: "quality_check" },
      { event: "PASS", expectedState: "completed" },
      { event: "INVOICE", expectedState: "invoiced" },
      { event: "PAY", expectedState: "paid" },
    ],
    errorPaths: [
      { name: "repair-qc-fail", steps: [{ event: "ACKNOWLEDGE", expectedState: "acknowledged" }, { event: "DIAGNOSE", expectedState: "diagnosed" }, { event: "SEND_QUOTE", expectedState: "quote_sent" }, { event: "APPROVE_QUOTE", expectedState: "quote_approved" }, { event: "START_REPAIR", expectedState: "in_repair" }, { event: "QC", expectedState: "quality_check" }, { event: "FAIL", expectedState: "in_repair" }] },
    ],
    terminalStates: ["paid", "cancelled"],
  },
  {
    id: "subscription",
    name: "Subscription Lifecycle",
    description: "Inactive → Trial → Active → Manage",
    machine: widenMachine(SUBSCRIPTION_MACHINE),
    happyPath: [
      { event: "START_TRIAL", expectedState: "trial" },
      { event: "CONVERT", expectedState: "active" },
    ],
    errorPaths: [
      { name: "subscription-payment-fail", steps: [{ event: "SUBSCRIBE", expectedState: "active" }, { event: "PAYMENT_FAIL", expectedState: "past_due" }, { event: "PAY", expectedState: "active" }] },
      { name: "subscription-pause-resume", steps: [{ event: "SUBSCRIBE", expectedState: "active" }, { event: "PAUSE", expectedState: "paused" }, { event: "RESUME", expectedState: "active" }] },
    ],
    terminalStates: ["cancelled"],
  },
  {
    id: "search-detail-contact",
    name: "Search → Detail → Contact",
    description: "User searches, views a listing, and contacts the owner",
    machine: {
      initial: "idle",
      states: {
        idle: { on: { SEARCH: "searching" } },
        searching: { on: { SELECT_RESULT: "viewing_detail", NO_RESULTS: "idle" } },
        viewing_detail: { on: { CONTACT: "contacting", BACK: "searching", BOOKMARK: "viewing_detail" } },
        contacting: { on: { MESSAGE_SENT: "contacted", CALL: "calling" } },
        contacted: {},
        calling: { on: { CONNECTED: "in_call", FAIL: "viewing_detail" } },
        in_call: { on: { HANGUP: "contacted" } },
      },
    },
    happyPath: [
      { event: "SEARCH", expectedState: "searching" },
      { event: "SELECT_RESULT", expectedState: "viewing_detail" },
      { event: "CONTACT", expectedState: "contacting" },
      { event: "MESSAGE_SENT", expectedState: "contacted" },
    ],
    errorPaths: [
      { name: "no-results", steps: [{ event: "SEARCH", expectedState: "searching" }, { event: "NO_RESULTS", expectedState: "idle" }] },
    ],
    terminalStates: ["contacted"],
    allowedSelfTransitions: ["BOOKMARK"],
  },
  {
    id: "wallet-payment",
    name: "Wallet Payment Flow",
    description: "Initiate payment → confirm → process → complete",
    machine: {
      initial: "idle",
      states: {
        idle: { on: { INITIATE: "confirming" } },
        confirming: { on: { CONFIRM: "processing", CANCEL: "cancelled" } },
        processing: { on: { SUCCESS: "completed", FAIL: "failed" } },
        completed: {},
        failed: { on: { RETRY: "confirming" } },
        cancelled: {},
      },
    },
    happyPath: [
      { event: "INITIATE", expectedState: "confirming" },
      { event: "CONFIRM", expectedState: "processing" },
      { event: "SUCCESS", expectedState: "completed" },
    ],
    errorPaths: [
      { name: "payment-fail-retry", steps: [{ event: "INITIATE", expectedState: "confirming" }, { event: "CONFIRM", expectedState: "processing" }, { event: "FAIL", expectedState: "failed" }, { event: "RETRY", expectedState: "confirming" }] },
      { name: "payment-cancel", steps: [{ event: "INITIATE", expectedState: "confirming" }, { event: "CANCEL", expectedState: "cancelled" }] },
    ],
    terminalStates: ["completed", "cancelled"],
  },
];

function verifyPath(
  machine: VerifiableMachine,
  path: FlowStep[],
  pathName: string,
): PathResult {
  let currentState = machine.initial;
  const steps: StepResult[] = [];

  for (const step of path) {
    const nextState = transitionVerifiable(machine, currentState, step.event);

    steps.push({
      event: step.event,
      fromState: currentState,
      expectedState: step.expectedState,
      actualState: nextState,
      passed: nextState === step.expectedState,
    });

    if (nextState !== step.expectedState) {
      return {
        name: pathName,
        passed: false,
        steps,
        failedAt: `${currentState} --[${step.event}]--> expected "${step.expectedState}" but got "${nextState}"`,
      };
    }

    currentState = nextState;
  }

  return { name: pathName, passed: true, steps };
}

function findDeadButtons(machine: VerifiableMachine): string[] {
  const dead: string[] = [];
  for (const [stateName, stateNode] of Object.entries(machine.states)) {
    if (!stateNode.on || Object.keys(stateNode.on).length === 0) continue;
    for (const [event, target] of Object.entries(stateNode.on)) {
      if (!machine.states[target]) {
        dead.push(`${stateName}.[${event}] → "${target}" (target state does not exist)`);
      }
    }
  }
  return dead;
}

function findIllegalTransitions(machine: VerifiableMachine, allowedSelf: Set<string>): string[] {
  const illegal: string[] = [];
  for (const [stateName, stateNode] of Object.entries(machine.states)) {
    if (!stateNode.on) continue;
    for (const [event, target] of Object.entries(stateNode.on)) {
      if (target === stateName && !LEGITIMATE_SELF_TRANSITION_EVENTS.has(event) && !allowedSelf.has(event)) {
        illegal.push(`${stateName}.[${event}] → self-transition (potential infinite loop)`);
      }
    }
  }
  return illegal;
}

function findSilentDrops(machine: VerifiableMachine, terminalStates: string[]): string[] {
  const drops: string[] = [];
  for (const [stateName, stateNode] of Object.entries(machine.states)) {
    if (terminalStates.includes(stateName)) continue;
    if (!stateNode.on || Object.keys(stateNode.on).length === 0) {
      drops.push(`${stateName}: no transitions defined (user gets stuck here)`);
    }
  }
  return drops;
}

function verifyFlow(flow: FlowDefinition): FlowVerificationResult {
  const startTime = Date.now();
  const evidence: string[] = [];
  const allowedSelf = new Set(flow.allowedSelfTransitions ?? []);

  const happyPathResult = verifyPath(flow.machine, flow.happyPath, "happy-path");
  evidence.push(`Happy path: ${happyPathResult.passed ? "PASS" : "FAIL"}`);

  const errorPathResults: PathResult[] = [];
  for (const ep of flow.errorPaths) {
    const result = verifyPath(flow.machine, ep.steps, ep.name);
    errorPathResults.push(result);
    evidence.push(`Error path "${ep.name}": ${result.passed ? "PASS" : "FAIL"}`);
  }

  const deadButtons = findDeadButtons(flow.machine);
  const illegalTransitions = findIllegalTransitions(flow.machine, allowedSelf);
  const silentDrops = findSilentDrops(flow.machine, flow.terminalStates);

  if (deadButtons.length > 0) evidence.push(`Dead buttons: ${deadButtons.join("; ")}`);
  if (illegalTransitions.length > 0) evidence.push(`Illegal transitions: ${illegalTransitions.join("; ")}`);
  if (silentDrops.length > 0) evidence.push(`Silent drops: ${silentDrops.join("; ")}`);

  const allPathsPassed = happyPathResult.passed && errorPathResults.every(r => r.passed);
  const noIssues = deadButtons.length === 0 && illegalTransitions.length === 0 && silentDrops.length === 0;

  return {
    flowId: flow.id,
    flowName: flow.name,
    passed: allPathsPassed && noIssues,
    happyPathResult,
    errorPathResults,
    deadButtons,
    illegalTransitions,
    silentDrops,
    evidence,
    durationMs: Date.now() - startTime,
  };
}

export function runE2EFlowVerification(): E2EVerificationReport {
  const startTime = Date.now();
  const flowResults: FlowVerificationResult[] = [];

  for (const flow of CRITICAL_FLOWS) {
    flowResults.push(verifyFlow(flow));
  }

  const passed = flowResults.filter(r => r.passed).length;
  const failed = flowResults.filter(r => !r.passed).length;

  return {
    totalFlows: CRITICAL_FLOWS.length,
    passed,
    failed,
    flowResults,
    deadButtonsTotal: flowResults.reduce((s, r) => s + r.deadButtons.length, 0),
    illegalTransitionsTotal: flowResults.reduce((s, r) => s + r.illegalTransitions.length, 0),
    silentDropsTotal: flowResults.reduce((s, r) => s + r.silentDrops.length, 0),
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

export function getE2EVerificationSummary(report: E2EVerificationReport): string {
  const lines = [
    `=== E2E FLOW VERIFICATION REPORT ===`,
    `Timestamp: ${report.timestamp}`,
    `Duration: ${report.durationMs}ms`,
    ``,
    `Total flows: ${report.totalFlows}`,
    `Passed: ${report.passed}`,
    `Failed: ${report.failed}`,
    `Dead buttons: ${report.deadButtonsTotal}`,
    `Illegal transitions: ${report.illegalTransitionsTotal}`,
    `Silent drops: ${report.silentDropsTotal}`,
    ``,
  ];

  for (const fr of report.flowResults) {
    const status = fr.passed ? "PASS" : "FAIL";
    lines.push(`[${status}] ${fr.flowName} (${fr.flowId})`);
    lines.push(`  Happy path: ${fr.happyPathResult.passed ? "PASS" : "FAIL"}`);
    if (!fr.happyPathResult.passed && fr.happyPathResult.failedAt) {
      lines.push(`    Failed at: ${fr.happyPathResult.failedAt}`);
    }
    for (const ep of fr.errorPathResults) {
      lines.push(`  Error path "${ep.name}": ${ep.passed ? "PASS" : "FAIL"}`);
      if (!ep.passed && ep.failedAt) {
        lines.push(`    Failed at: ${ep.failedAt}`);
      }
    }
    if (fr.deadButtons.length > 0) lines.push(`  Dead buttons: ${fr.deadButtons.join("; ")}`);
    if (fr.illegalTransitions.length > 0) lines.push(`  Illegal transitions: ${fr.illegalTransitions.join("; ")}`);
    if (fr.silentDrops.length > 0) lines.push(`  Silent drops: ${fr.silentDrops.join("; ")}`);
    lines.push(``);
  }

  return lines.join("\n");
}

export { CRITICAL_FLOWS };
