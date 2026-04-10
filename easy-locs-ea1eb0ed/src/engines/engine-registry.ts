import { engineOrchestrator } from "./core/engine-orchestrator";

import { ConstraintEngine } from "./architecture/constraint-engine";
import { SSOTAuditor } from "./architecture/ssot-auditor";
import { DomainBoundaryEnforcer } from "./architecture/domain-boundary-enforcer";
import { PlatformBusEnforcer } from "./architecture/platformbus-enforcer";

import { CodeAuditor } from "./code-quality/code-auditor";
import { DuplicationDetector } from "./code-quality/duplication-detector";
import { RefactorSuggester } from "./code-quality/refactor-suggester";
import { ModuleCleanupEngine } from "./code-quality/module-cleanup-engine";

import { ErrorClassifier } from "./self-healing/error-classifier";
import { AutoFixEngine } from "./self-healing/auto-fix-engine";
import { RollbackEngine } from "./self-healing/rollback-engine";
import { SilentRecoveryService } from "./self-healing/silent-recovery.service";

import { PerfAnalyzer } from "./performance/perf-analyzer";
import { RenderOptimizer } from "./performance/render-optimizer";
import { QueryOptimizer } from "./performance/query-optimizer";
import { CachePolicyEngine } from "./performance/cache-policy-engine";
import { NetworkLatencyEngine } from "./performance/network-latency-engine";

import { PresenceHealthEngine } from "./realtime/presence-health-engine";
import { SyncRepairEngine } from "./realtime/sync-repair-engine";
import { UnreadIntegrityEngine } from "./realtime/unread-integrity-engine";
import { MessageReconcileEngine } from "./realtime/message-reconcile-engine";
import { RetryReplayEngine } from "./realtime/retry-replay-engine";

import { LedgerIntegrityEngine } from "./wallet/ledger-integrity-engine";
import { ReconciliationEngine } from "./wallet/reconciliation-engine";
import { FraudWatchEngine } from "./wallet/fraud-watch-engine";
import { PayoutSafetyEngine } from "./wallet/payout-safety-engine";
import { FXConsistencyEngine } from "./wallet/fx-consistency-engine";

import { ZeroTrustEngine } from "./security/zero-trust-engine";
import { SessionRiskEngine } from "./security/session-risk-engine";
import { DeviceTrustEngine } from "./security/device-trust-engine";
import { PolicyHardener } from "./security/policy-hardener";
import { AnomalyDetector } from "./security/anomaly-detector";

import { MessageDeliveryEngine } from "./orbit/message-delivery-engine";
import { MediaFlowEngine } from "./orbit/media-flow-engine";
import { ConversationConsistencyEngine } from "./orbit/conversation-consistency-engine";
import { GroupIntegrityEngine } from "./orbit/group-integrity-engine";
import { OptimisticUIEngine } from "./orbit/optimistic-ui-engine";

import { CallHealthEngine } from "./calls/call-health-engine";
import { NetworkAdaptationEngine } from "./calls/network-adaptation-engine";
import { ReconnectEngine } from "./calls/reconnect-engine";
import { MediaQualityEngine } from "./calls/media-quality-engine";

import { LocationIntegrityEngine } from "./radar/location-integrity-engine";
import { GeocodeRepairEngine } from "./radar/geocode-repair-engine";
import { ProviderMatchingEngine } from "./radar/provider-matching-engine";
import { RoutingQualityEngine } from "./radar/routing-quality-engine";
import { ETAAccuracyEngine } from "./radar/eta-accuracy-engine";

import { MenuNormalizer } from "./data/menu-normalizer";
import { ServiceNormalizer } from "./data/service-normalizer";
import { PropertyNormalizer } from "./data/property-normalizer";
import { HotelNormalizer } from "./data/hotel-normalizer";
import { TaxonomyEnforcer } from "./data/taxonomy-enforcer";
import { CurrencyPolicyEngine } from "./data/currency-policy-engine";

import { UXFrictionEngine } from "./uiux/ux-friction-engine";
import { LayoutConsistencyEngine } from "./uiux/layout-consistency-engine";
import { InteractionOptimizer } from "./uiux/interaction-optimizer";
import { DesignRegressionEngine } from "./uiux/design-regression-engine";
import { AccessibilityEngine } from "./uiux/accessibility-engine";

import { FlowIntegrityEngine } from "./business/flow-integrity-engine";
import { ConversionEngine } from "./business/conversion-engine";
import { FunnelDetectionEngine } from "./business/funnel-detection-engine";
import { DropoffRepairEngine } from "./business/dropoff-repair-engine";
import { CommissionEngine } from "./business/commission-engine";
import { RevenueIntelligenceEngine } from "./business/revenue-intelligence-engine";
import { GrowthIntelligenceEngine } from "./business/growth-intelligence-engine";

import { TicketPatternEngine } from "./support/ticket-pattern-engine";
import { IncidentClusteringEngine } from "./support/incident-clustering-engine";
import { RootCauseEngine } from "./support/root-cause-engine";
import { ResolutionOptimizer } from "./support/resolution-optimizer";

import { TraceCorrelationEngine } from "./observability/trace-correlation-engine";
import { BusinessEventsEngine } from "./observability/business-events-engine";
import { ErrorHeatmapEngine } from "./observability/error-heatmap-engine";
import { ReleaseImpactEngine } from "./observability/release-impact-engine";

import { ReleaseGateEngine } from "./release/release-gate-engine";
import { ShadowModeEngine } from "./release/shadow-mode-engine";
import { CanaryControlEngine } from "./release/canary-control-engine";
import { RollbackTriggerEngine } from "./release/rollback-trigger-engine";

import { AIAnalysisEngine } from "./ai/analysis-engine";
import { CodeSuggestionEngine } from "./ai/code-suggestion-engine";
import { RuntimeAnomalyEngine } from "./ai/runtime-anomaly-engine";
import { PolicyGuardEngine } from "./ai/policy-guard-engine";

let registered = false;

export function registerAllEngines(): void {
  if (registered) return;
  registered = true;

  engineOrchestrator.registerAll([
    new ConstraintEngine(),
    new SSOTAuditor(),
    new DomainBoundaryEnforcer(),
    new PlatformBusEnforcer(),

    new CodeAuditor(),
    new DuplicationDetector(),
    new RefactorSuggester(),
    new ModuleCleanupEngine(),

    new ErrorClassifier(),
    new AutoFixEngine(),
    new RollbackEngine(),
    new SilentRecoveryService(),

    new PerfAnalyzer(),
    new RenderOptimizer(),
    new QueryOptimizer(),
    new CachePolicyEngine(),
    new NetworkLatencyEngine(),

    new PresenceHealthEngine(),
    new SyncRepairEngine(),
    new UnreadIntegrityEngine(),
    new MessageReconcileEngine(),
    new RetryReplayEngine(),

    new LedgerIntegrityEngine(),
    new ReconciliationEngine(),
    new FraudWatchEngine(),
    new PayoutSafetyEngine(),
    new FXConsistencyEngine(),

    new ZeroTrustEngine(),
    new SessionRiskEngine(),
    new DeviceTrustEngine(),
    new PolicyHardener(),
    new AnomalyDetector(),

    new MessageDeliveryEngine(),
    new MediaFlowEngine(),
    new ConversationConsistencyEngine(),
    new GroupIntegrityEngine(),
    new OptimisticUIEngine(),

    new CallHealthEngine(),
    new NetworkAdaptationEngine(),
    new ReconnectEngine(),
    new MediaQualityEngine(),

    new LocationIntegrityEngine(),
    new GeocodeRepairEngine(),
    new ProviderMatchingEngine(),
    new RoutingQualityEngine(),
    new ETAAccuracyEngine(),

    new MenuNormalizer(),
    new ServiceNormalizer(),
    new PropertyNormalizer(),
    new HotelNormalizer(),
    new TaxonomyEnforcer(),
    new CurrencyPolicyEngine(),

    new UXFrictionEngine(),
    new LayoutConsistencyEngine(),
    new InteractionOptimizer(),
    new DesignRegressionEngine(),
    new AccessibilityEngine(),

    new FlowIntegrityEngine(),
    new ConversionEngine(),
    new FunnelDetectionEngine(),
    new DropoffRepairEngine(),
    new CommissionEngine(),
    new RevenueIntelligenceEngine(),
    new GrowthIntelligenceEngine(),

    new TicketPatternEngine(),
    new IncidentClusteringEngine(),
    new RootCauseEngine(),
    new ResolutionOptimizer(),

    new TraceCorrelationEngine(),
    new BusinessEventsEngine(),
    new ErrorHeatmapEngine(),
    new ReleaseImpactEngine(),

    new ReleaseGateEngine(),
    new ShadowModeEngine(),
    new CanaryControlEngine(),
    new RollbackTriggerEngine(),

    new AIAnalysisEngine(),
    new CodeSuggestionEngine(),
    new RuntimeAnomalyEngine(),
    new PolicyGuardEngine(),
  ]);
}

export function bootEngineSystem(): () => void {
  registerAllEngines();
  engineOrchestrator.startAll();

  let disposed = false;
  let teardownAI: (() => void) | null = null;

  (async () => {
    const [{ agentIntelligence }, { automationPipelines }] = await Promise.all([
      import("./ai/agent-intelligence"),
      import("./ai/automation-pipeline"),
    ]);
    if (disposed) return;
    agentIntelligence.start();
    automationPipelines.start();
    teardownAI = () => {
      automationPipelines.stop();
      agentIntelligence.stop();
    };
  })();

  return () => {
    disposed = true;
    teardownAI?.();
    engineOrchestrator.stopAll();
  };
}
