import { engineOrchestrator } from "./core/engine-orchestrator";

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

let tier1Done = false;

export function registerAllEngines(): void {
  if (tier1Done) return;
  tier1Done = true;

  engineOrchestrator.registerAll([
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
  ]);
}

let tier2Done = false;

async function loadAndStartTier2(): Promise<void> {
  if (tier2Done) return;
  tier2Done = true;
  const [
    { ConstraintEngine },
    { SSOTAuditor },
    { DomainBoundaryEnforcer },
    { PlatformBusEnforcer },
    { CodeAuditor },
    { DuplicationDetector },
    { RefactorSuggester },
    { ModuleCleanupEngine },
    { UXFrictionEngine },
    { LayoutConsistencyEngine },
    { InteractionOptimizer },
    { DesignRegressionEngine },
    { AccessibilityEngine },
    { FlowIntegrityEngine },
    { ConversionEngine },
    { FunnelDetectionEngine },
    { DropoffRepairEngine },
    { CommissionEngine },
    { RevenueIntelligenceEngine },
    { GrowthIntelligenceEngine },
    { TicketPatternEngine },
    { IncidentClusteringEngine },
    { RootCauseEngine },
    { ResolutionOptimizer },
    { TraceCorrelationEngine },
    { BusinessEventsEngine },
    { ErrorHeatmapEngine },
    { ReleaseImpactEngine },
    { ReleaseGateEngine },
    { ShadowModeEngine },
    { CanaryControlEngine },
    { RollbackTriggerEngine },
    { AIAnalysisEngine },
    { CodeSuggestionEngine },
    { RuntimeAnomalyEngine },
    { PolicyGuardEngine },
  ] = await Promise.all([
    import("./architecture/constraint-engine"),
    import("./architecture/ssot-auditor"),
    import("./architecture/domain-boundary-enforcer"),
    import("./architecture/platformbus-enforcer"),
    import("./code-quality/code-auditor"),
    import("./code-quality/duplication-detector"),
    import("./code-quality/refactor-suggester"),
    import("./code-quality/module-cleanup-engine"),
    import("./uiux/ux-friction-engine"),
    import("./uiux/layout-consistency-engine"),
    import("./uiux/interaction-optimizer"),
    import("./uiux/design-regression-engine"),
    import("./uiux/accessibility-engine"),
    import("./business/flow-integrity-engine"),
    import("./business/conversion-engine"),
    import("./business/funnel-detection-engine"),
    import("./business/dropoff-repair-engine"),
    import("./business/commission-engine"),
    import("./business/revenue-intelligence-engine"),
    import("./business/growth-intelligence-engine"),
    import("./support/ticket-pattern-engine"),
    import("./support/incident-clustering-engine"),
    import("./support/root-cause-engine"),
    import("./support/resolution-optimizer"),
    import("./observability/trace-correlation-engine"),
    import("./observability/business-events-engine"),
    import("./observability/error-heatmap-engine"),
    import("./observability/release-impact-engine"),
    import("./release/release-gate-engine"),
    import("./release/shadow-mode-engine"),
    import("./release/canary-control-engine"),
    import("./release/rollback-trigger-engine"),
    import("./ai/analysis-engine"),
    import("./ai/code-suggestion-engine"),
    import("./ai/runtime-anomaly-engine"),
    import("./ai/policy-guard-engine"),
  ]);

  const tier2Engines = [
    new ConstraintEngine(),
    new SSOTAuditor(),
    new DomainBoundaryEnforcer(),
    new PlatformBusEnforcer(),
    new CodeAuditor(),
    new DuplicationDetector(),
    new RefactorSuggester(),
    new ModuleCleanupEngine(),
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
  ];

  engineOrchestrator.registerAll(tier2Engines);
  for (const engine of tier2Engines) {
    const registered = engineOrchestrator.getEngine(engine.id);
    if (registered && !registered.isRunning) registered.start();
  }

  if (import.meta.env.DEV) {
    console.log(`[engine-registry] Tier 2: ${tier2Engines.length} engines loaded`);
  }
}

let tier3Done = false;

async function loadAndStartTier3(): Promise<void> {
  if (tier3Done) return;
  tier3Done = true;
  const [
    { TaxonomyEngine },
    { CanonicalMappingEngine },
    { ProfileQualityEngine },
    { AddressEngine },
    { ModuleLinkEngine },
    { RoutingQualityEngine: QRoutingEngine },
    { UIPolishEngine },
    { DataCleaningEngine },
    { SEOEngine },
    { DeadCodeEngine },
    { DeadFlowEngine },
    { WalletQualityEngine },
    { OrbitQualityEngine },
    { RadarOptimizationEngine },
    { MeBusinessEngine },
    { PropertyEngine },
    { CountryRulesEngine },
    { AutomationEngine },
    { QualityObservabilityEngine },
    { TestEnforcementEngine },
    { FeatureFlagEngine },
    { QualityScoreEngine },
  ] = await Promise.all([
    import("./quality/taxonomy-engine"),
    import("./quality/canonical-mapping-engine"),
    import("./quality/profile-quality-engine"),
    import("./quality/address-engine"),
    import("./quality/module-link-engine"),
    import("./quality/routing-quality-engine"),
    import("./quality/ui-polish-engine"),
    import("./quality/data-cleaning-engine"),
    import("./quality/seo-engine"),
    import("./quality/dead-code-engine"),
    import("./quality/dead-flow-engine"),
    import("./quality/wallet-quality-engine"),
    import("./quality/orbit-quality-engine"),
    import("./quality/radar-optimization-engine"),
    import("./quality/me-business-engine"),
    import("./quality/property-engine"),
    import("./quality/country-rules-engine"),
    import("./quality/automation-engine"),
    import("./quality/observability-engine"),
    import("./quality/test-enforcement-engine"),
    import("./quality/feature-flag-engine"),
    import("./quality/quality-score-engine"),
  ]);

  const tier3Engines = [
    new TaxonomyEngine(),
    new CanonicalMappingEngine(),
    new ProfileQualityEngine(),
    new AddressEngine(),
    new ModuleLinkEngine(),
    new QRoutingEngine(),
    new UIPolishEngine(),
    new DataCleaningEngine(),
    new SEOEngine(),
    new DeadCodeEngine(),
    new DeadFlowEngine(),
    new WalletQualityEngine(),
    new OrbitQualityEngine(),
    new RadarOptimizationEngine(),
    new MeBusinessEngine(),
    new PropertyEngine(),
    new CountryRulesEngine(),
    new AutomationEngine(),
    new QualityObservabilityEngine(),
    new TestEnforcementEngine(),
    new FeatureFlagEngine(),
    new QualityScoreEngine(),
  ];

  engineOrchestrator.registerAll(tier3Engines);
  for (const engine of tier3Engines) {
    const registered = engineOrchestrator.getEngine(engine.id);
    if (registered && !registered.isRunning) registered.start();
  }

  if (import.meta.env.DEV) {
    console.log(`[engine-registry] Tier 3 (Quality): ${tier3Engines.length} engines loaded`);
  }
}

export function bootEngineSystem(): () => void {
  registerAllEngines();
  engineOrchestrator.startAll();

  let disposed = false;
  let teardownAI: (() => void) | null = null;

  const tier2Timer = import.meta.env.DEV ? setTimeout(() => {
    if (disposed) return;
    loadAndStartTier2().catch(e =>
      console.warn("[engine-registry] Tier 2 load failed", e)
    );
  }, 8000) : null;

  const tier3Timer = setTimeout(() => {
    if (disposed) return;
    loadAndStartTier3().catch(e =>
      console.warn("[engine-registry] Tier 3 (Quality) load failed", e)
    );
  }, 12000);

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
    if (tier2Timer) clearTimeout(tier2Timer);
    clearTimeout(tier3Timer);
    teardownAI?.();
    engineOrchestrator.stopAll();
  };
}
