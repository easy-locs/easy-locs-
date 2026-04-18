import { Route, Navigate, useLocation, useParams } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import SuperAdminGate from "@/components/auth/SuperAdminGate";
import AdminShellWithChunkBoundary from "@/components/admin/AdminShellChunkBoundary";
import * as Pages from "@/app/app-route-registry";

/**
 * ACP Agent 3 (#863) — Legacy redirect helpers.
 * Preserve query string when redirecting an old admin URL to its new
 * /admin/control/* equivalent. Uses replace so the legacy URL doesn't pollute
 * browser history (no back-button redirect loops).
 */
function LegacyControlRedirect({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
}

/**
 * ACP Agent 3 (#863) — /admin/agents/:slug/runs → /admin/control/runs?agent=:slug
 * Promotes the :slug path param to an `agent` query param while preserving
 * any other query params already present on the legacy URL.
 */
function LegacyAgentRunsRedirect() {
  const { slug } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (slug) params.set("agent", slug);
  const qs = params.toString();
  return <Navigate to={`/admin/control/runs${qs ? `?${qs}` : ""}`} replace />;
}

const {
  AdminAIControlCenter, AdminAlertCenterPage, AdminAnalyticsOpsPage, AdminArchitectureLabPage,
  AdminAutonomyDashboardPage, AdminContentOpsPage, AdminControlRoomPage, AdminCrmOpsPage, AdminDashboard,
  AdminDataLabPage, AdminDataQualityPage, AdminDeliveryOpsPage, AdminDisputesPage, AdminDldBackfillPage,
  AdminDriverMonitorPage, AdminEnginesDashboardPage, AdminExperimentLabPage, AdminFinanceSummaryPage,
  AdminFirecrawlUsagePage, AdminFraudDetectionPage, AdminGrowthOpsPage, AdminIntegrationHealthPage, AdminClientIntegrationDiagnosticsPage,
  AdminKycReviewPage, AdminLabHubPage, AdminMapErrorDashboardPage, AdminMergeConflictRecoveryPage, AdminMarketplaceOpsPage,
  AdminMasterControlPage, AdminApprovalsPage, AdminAgentsPage, AdminAgentRunsPage, AdminMerchantApprovalQueuePage, AdminMerchantHealthPage,
  AdminNotificationLabPage, AdminNotificationOpsPage, AdminOpsDashboardPage, AdminOrderWatchPage,
  AdminPaymentsOpsPage, AdminPerformanceLabPage, AdminPipelinePage, AdminPlatformHealthPage, AdminWatchdogPage,
  AdminQualityOpsPage, AdminRealtimeControlPage, AdminRefundQueuePage, AdminReleaseHistoryPage,
  AdminRetentionOpsPage, AdminReviewQueuePage, AdminSecurityLabPage, AdminSeedToolsPage,
  AdminShopImportPage, AdminShopQualityPage, AdminSourceAuditPage, AdminSuperDashboardPage,
  AdminSupportOpsPage, AdminSupportSlaPage, AdminSystemHealthPage, AdminUiEnginePage,
  AdminUserLookupPage, AdminWalletDiagnosticsPage, AdminWiringHealthPage, ArchitectureMapPage,
  AuditCenterPage, CommandCenterPage, CommandControlDashboard, DeliveryProofPage, DeployCenterPage,
  EvolutionCenterPage,
  DevOSDashboardPage, DeveloperPortalDocs, DriverLivePage, EngineControlRoomPage, ExecutionProofPage,
  FinancialReconPage, FoodOrderCheckoutPage, LoyaltyRedeemPage, MemoryCenterPage, MenuAdminPage,
  QrGeneratePage, RepairCenterPage, StatementDashboardPage, SupportInboxPage,
} = Pages;

export function AdminRoutes() {
  return (
    <>
      <Route path="/builder" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><DevOSDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/builder/architecture" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><ArchitectureMapPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/builder/audit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AuditCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/builder/repair" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><RepairCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/builder/memory" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><MemoryCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/builder/deploy" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><DeployCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/builder/evolution" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><EvolutionCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />

      {/* ══ Admin ══ */}
      <Route path="/admin" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDashboard /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/engines" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminEnginesDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/wiring-health" element={<LegacyControlRedirect to="/admin/control/wiring" />} />
      <Route path="/admin/ops-dashboard" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminOpsDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/fraud-detection" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminFraudDetectionPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/disputes" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDisputesPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/financial-recon" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><FinancialReconPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/menu" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><MenuAdminPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/support-inbox" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><SupportInboxPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/driver-live" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><DriverLivePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/driver-monitor" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDriverMonitorPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/realtime-control" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminRealtimeControlPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/loyalty-redeem" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><LoyaltyRedeemPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/alerts" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminAlertCenterPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/wallet-diagnostics" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminWalletDiagnosticsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/execution-proof" element={<LegacyControlRedirect to="/admin/control/proof" />} />
      <Route path="/admin/review-queue" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminReviewQueuePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/growth-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminGrowthOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/qr-generate" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><QrGeneratePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/ui-engine" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminUiEnginePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/marketplace-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMarketplaceOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/pipeline" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminPipelinePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/ai-control-center" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminAIControlCenter /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/support-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSupportOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/delivery-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDeliveryOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/merchant-health" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMerchantHealthPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/merchant-approval-queue" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMerchantApprovalQueuePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/payments-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminPaymentsOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/notification-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminNotificationOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/seed-tools" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSeedToolsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/shop-import" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminShopImportPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/shop-quality" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminShopQualityPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/content-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminContentOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/analytics-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminAnalyticsOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/quality-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminQualityOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/crm-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminCrmOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/retention-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminRetentionOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/support-sla" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSupportSlaPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/source-audit" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSourceAuditPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/user-lookup" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminUserLookupPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/finance-summary" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminFinanceSummaryPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/order-watch" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminOrderWatchPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/refund-queue" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminRefundQueuePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/system-health" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSystemHealthPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/firecrawl-usage" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminFirecrawlUsagePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/platform-health" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminPlatformHealthPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/watchdog" element={<LegacyControlRedirect to="/admin/control/watchdog" />} />
      <Route path="/admin/map-errors" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMapErrorDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/merge-conflict-recovery" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMergeConflictRecoveryPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/data-quality" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDataQualityPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/command-control" element={<LegacyControlRedirect to="/admin/control" />} />
      <Route path="/admin/food-checkout" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><FoodOrderCheckoutPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/delivery-proof/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><DeliveryProofPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/kyc" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminKycReviewPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/super-dashboard" element={<LegacyControlRedirect to="/admin/control" />} />
      <Route path="/admin/dld-backfill" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDldBackfillPage /></FeatureErrorBoundary></ProtectedRoute>} />
      {/* ACP · /admin/control unified shell (#861).
          Sensitive sections (agents/runs/command/approvals/master) are wrapped
          ProtectedRoute > SuperAdminGate so non-admins still see the shared
          AdminAccessDenied screen and admins fall through to SuperAdminGate.
          Explicit paths take precedence over the `:section` catch-all (v6).
          Note (#863): /admin/command-center is intentionally NOT defined as a
          real route here — it is registered below as a legacy redirect into
          /admin/control/command. */}
      <Route path="/admin/control" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/control/agents" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/runs" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/command" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/approvals" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/master" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      {/* Task #1031 — Supreme Admin Dashboard P0 sections. SuperAdminGate
          is non-negotiable on every Phase 1 section. */}
      <Route path="/admin/control/tasks" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/watchdog" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/proof" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/wiring" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/:section" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminShellWithChunkBoundary /></FeatureErrorBoundary></ProtectedRoute>} />

      {/* ══ ACP Agent 3 (#863) · Legacy admin URL redirects → /admin/control/* ══
          Old URLs (bookmarks, external links, in-app navigation) keep working
          and land on the matching section of the unified control plane. Query
          strings are preserved; for /admin/agents/:slug/runs the :slug is
          promoted to ?agent=:slug. While Agents 5–9 ship their sections, the
          target route falls back to Agent 1's shell — no 404, no white screen.
          The original page components remain in app-route-registry (not
          deleted) per task #863 scope. */}
      <Route path="/admin/agents/:slug/runs" element={<LegacyAgentRunsRedirect />} />
      <Route path="/admin/agents" element={<LegacyControlRedirect to="/admin/control/agents" />} />
      <Route path="/admin/command-center" element={<LegacyControlRedirect to="/admin/control/command" />} />
      <Route path="/admin/approvals" element={<LegacyControlRedirect to="/admin/control/approvals" />} />
      <Route path="/admin/autonomy" element={<LegacyControlRedirect to="/admin/control/autonomy" />} />
      <Route path="/admin/control-room" element={<LegacyControlRedirect to="/admin/control/engines" />} />
      <Route path="/admin/engine-control-room" element={<LegacyControlRedirect to="/admin/control/engines" />} />
      <Route path="/admin/master-control" element={<LegacyControlRedirect to="/admin/control/master" />} />

      {/* ══ Internal Labs ══ */}
      <Route path="/admin/lab-hub" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminLabHubPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/performance-lab" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminPerformanceLabPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/data-lab" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDataLabPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/security-lab" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSecurityLabPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/release-history" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminReleaseHistoryPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/notification-lab" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminNotificationLabPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/experiment-lab" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminExperimentLabPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/architecture-lab" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminArchitectureLabPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/integration-health" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminIntegrationHealthPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/integration-diagnostics" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminClientIntegrationDiagnosticsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/statement" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><StatementDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/developer-portal/docs" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><DeveloperPortalDocs /></FeatureErrorBoundary></ProtectedRoute>} />

    </>
  );
}
