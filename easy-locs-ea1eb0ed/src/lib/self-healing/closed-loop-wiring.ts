import { platformBus } from "@/lib/shared/platform-bus";
import { domainCircuitBreaker } from "@/lib/infrastructure/domain-circuit-breaker";
import { predictiveAnomalyDetector, type AnomalyDetection } from "@/lib/predictive/anomaly-detector";
import { boundaryContractValidator, type ContractViolation } from "@/lib/contracts/boundary-validators";
import { flowStateManager, type FlowRecovery } from "@/lib/state-machines/flow-state-manager";
import { recordObservabilityProof } from "@/lib/enforcement/observability";

export interface ClosedLoopMetrics {
  predictive: {
    totalPredictions: number;
    predictionsTriggered: number;
    preemptiveThrottles: number;
    domainsMonitored: number;
    throttledDomains: string[];
  };
  contracts: {
    totalValidations: number;
    totalViolations: number;
    contractsEnforced: number;
    violationsByBoundary: Record<string, number>;
  };
  flows: {
    activeFlows: number;
    totalTransitions: number;
    totalRecoveries: number;
    recoveryByFlowType: Record<string, number>;
  };
  wiring: {
    installed: boolean;
    throttleToCircuitBreaker: number;
    violationToIncident: number;
    recoveryToAudit: number;
    lastUpdated: number;
  };
}

let _installed = false;
let _unsubs: (() => void)[] = [];
let _throttleToCircuitBreaker = 0;
let _violationToIncident = 0;
let _recoveryToAudit = 0;

function wireAnomalyDetectorToCircuitBreakers(): () => void {
  return platformBus.on("predictive:preemptive_throttle", (event) => {
    const payload = event.payload as {
      domain: string;
      detections: { type: string; severity: string; value: number }[];
      throttleUntil: number;
    };

    const hasCritical = payload.detections.some(d => d.severity === "critical");

    if (hasCritical) {
      for (let i = 0; i < 3; i++) {
        domainCircuitBreaker.recordFailure(payload.domain);
      }
      _throttleToCircuitBreaker++;
    } else {
      domainCircuitBreaker.recordFailure(payload.domain);
      _throttleToCircuitBreaker++;
    }
  });
}

function wireContractViolationsToIncidents(): () => void {
  return platformBus.on("contract:violation", (event) => {
    const payload = event.payload as {
      contractName: string;
      boundary: string;
      violationCount: number;
      fields: string[];
    };

    _violationToIncident++;

    if (payload.boundary === "api") {
      const parts = payload.contractName.split(":");
      const domain = parts.length >= 2 ? parts[1] : payload.contractName;
      if (domain && domain !== "unknown") {
        predictiveAnomalyDetector.recordError(domain);
      }
    }

    platformBus.emit("incident:contract_violation", {
      source: "boundary-contract-validator",
      contractName: payload.contractName,
      boundary: payload.boundary,
      violationCount: payload.violationCount,
      fields: payload.fields,
      severity: payload.violationCount > 3 ? "high" : "medium",
      timestamp: Date.now(),
    }, "system");
  });
}

function wireFlowRecoveryToAudit(): () => void {
  return platformBus.on("flow:recovery", (event) => {
    const payload = event.payload as {
      flowId: string;
      flowType: string;
      fromState: string;
      attemptedEvent: string;
      recoveredTo: string;
    };

    _recoveryToAudit++;

    predictiveAnomalyDetector.recordError(payload.flowType);

    platformBus.emit("audit:flow_recovery", {
      source: "flow-state-manager",
      flowId: payload.flowId,
      flowType: payload.flowType,
      fromState: payload.fromState,
      attemptedEvent: payload.attemptedEvent,
      recoveredTo: payload.recoveredTo,
      timestamp: Date.now(),
    }, "system");
  });
}

function wireFlowPruning(): () => void {
  const interval = setInterval(() => {
    flowStateManager.pruneCompletedFlows(300_000);
  }, 60_000);

  return () => clearInterval(interval);
}

export function installClosedLoopWiring(): () => void {
  if (_installed) return () => {};
  _installed = true;

  const anomalyUnsub = predictiveAnomalyDetector.install();
  const busInterceptorUnsub = boundaryContractValidator.installBusInterceptor();

  _unsubs.push(anomalyUnsub);
  _unsubs.push(busInterceptorUnsub);
  _unsubs.push(wireAnomalyDetectorToCircuitBreakers());
  _unsubs.push(wireContractViolationsToIncidents());
  _unsubs.push(wireFlowRecoveryToAudit());
  _unsubs.push(wireFlowPruning());

  recordObservabilityProof({
    id: `proof-closed-loop-installed-${Date.now()}`,
    source: "closed-loop-wiring",
    category: "integrity",
    timestamp: new Date().toISOString(),
    what: "Closed-loop self-healing system installed",
    why: "Predictive + Contract + StateMachine layers wired to existing infrastructure",
    where: "system:closed-loop",
    correction: "N/A — installation event",
    fallbackUsed: false,
    rollbackUsed: false,
    recurrenceRisk: "low",
  });

  platformBus.emit("system:closed_loop_installed", {
    layers: ["predictive-anomaly-detector", "boundary-contract-validator", "flow-state-manager"],
    timestamp: Date.now(),
  }, "system");

  return () => uninstallClosedLoopWiring();
}

export function uninstallClosedLoopWiring(): void {
  for (const unsub of _unsubs) unsub();
  _unsubs = [];
  _installed = false;
}

export function getClosedLoopMetrics(): ClosedLoopMetrics {
  const predictiveMetrics = predictiveAnomalyDetector.getMetrics();
  const contractMetrics = boundaryContractValidator.getMetrics();
  const flowMetrics = flowStateManager.getMetrics();

  return {
    predictive: {
      totalPredictions: predictiveMetrics.totalPredictions,
      predictionsTriggered: predictiveMetrics.predictionsTriggered,
      preemptiveThrottles: predictiveMetrics.preemptiveThrottles,
      domainsMonitored: predictiveMetrics.domainsMonitored,
      throttledDomains: predictiveMetrics.throttledDomains,
    },
    contracts: {
      totalValidations: contractMetrics.totalValidations,
      totalViolations: contractMetrics.totalViolations,
      contractsEnforced: contractMetrics.contractsEnforced,
      violationsByBoundary: contractMetrics.violationsByBoundary,
    },
    flows: {
      activeFlows: flowMetrics.activeFlows,
      totalTransitions: flowMetrics.totalTransitions,
      totalRecoveries: flowMetrics.totalRecoveries,
      recoveryByFlowType: flowMetrics.recoveryByFlowType,
    },
    wiring: {
      installed: _installed,
      throttleToCircuitBreaker: _throttleToCircuitBreaker,
      violationToIncident: _violationToIncident,
      recoveryToAudit: _recoveryToAudit,
      lastUpdated: Date.now(),
    },
  };
}

export function isClosedLoopInstalled(): boolean {
  return _installed;
}

export function resetClosedLoop(): void {
  uninstallClosedLoopWiring();
  predictiveAnomalyDetector.reset();
  boundaryContractValidator.reset();
  flowStateManager.reset();
  _throttleToCircuitBreaker = 0;
  _violationToIncident = 0;
  _recoveryToAudit = 0;
}
