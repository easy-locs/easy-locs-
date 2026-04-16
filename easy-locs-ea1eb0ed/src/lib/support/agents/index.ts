import { platformBus } from "@/lib/shared/platform-bus";

export { runShopMonitorAgent } from "./shop-monitor-agent";
export { runLearningAgent } from "./learning-agent";
export { runPaymentAnomalyAgent } from "./payment-anomaly-agent";

const agentTimers: ReturnType<typeof setInterval>[] = [];

const AGENT_INTERVALS = {
  shopMonitor: 30 * 60 * 1000,
  learning: 60 * 60 * 1000,
  paymentAnomaly: 15 * 60 * 1000,
} as const;

async function safeRun(name: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    console.log(`[support-agents] ${name}:`, result);
  } catch (err) {
    console.error(`[support-agents] ${name} error:`, err);
  }
}

export function startSupportAgentLoop(): void {
  if (agentTimers.length > 0) return;

  console.log("[support-agents] Starting background agent loop");

  const runShop = async () => {
    const { runShopMonitorAgent } = await import("./shop-monitor-agent");
    return runShopMonitorAgent();
  };

  const runPayment = async () => {
    const { runPaymentAnomalyAgent } = await import("./payment-anomaly-agent");
    return runPaymentAnomalyAgent();
  };

  const runLearn = async () => {
    const { runLearningAgent } = await import("./learning-agent");
    return runLearningAgent();
  };

  agentTimers.push(
    setInterval(() => safeRun("Shop monitor", runShop), AGENT_INTERVALS.shopMonitor),
    setInterval(() => safeRun("Payment anomaly", runPayment), AGENT_INTERVALS.paymentAnomaly),
    setInterval(() => safeRun("Learning", runLearn), AGENT_INTERVALS.learning),
  );

  setTimeout(() => {
    safeRun("Shop monitor", runShop);
    safeRun("Payment anomaly", runPayment);
    safeRun("Learning", runLearn);
  }, 5000);

  platformBus.emit("support:agents_started", {
    agents: ["shop_monitor", "payment_anomaly", "learning"],
    intervals: AGENT_INTERVALS,
  }, "system");
}

export function stopSupportAgentLoop(): void {
  for (const timer of agentTimers) clearInterval(timer);
  agentTimers.length = 0;
  console.log("[support-agents] Agent loop stopped");
}
