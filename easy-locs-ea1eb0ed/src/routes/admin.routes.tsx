import { Route } from "react-router-dom";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import SuperAdminGate from "@/components/auth/SuperAdminGate";
import * as Pages from "@/app/app-route-registry";

const {
  AdminAIControlCenter, AdminAlertCenterPage, AdminAnalyticsOpsPage, AdminArchitectureLabPage,
  AdminAutonomyDashboardPage, AdminContentOpsPage, AdminControlRoomPage, AdminCrmOpsPage, AdminDashboard,
  AdminDataLabPage, AdminDataQualityPage, AdminDeliveryOpsPage, AdminDisputesPage, AdminDldBackfillPage,
  AdminDriverMonitorPage, AdminEnginesDashboardPage, AdminExperimentLabPage, AdminFinanceSummaryPage,
  AdminFirecrawlUsagePage, AdminFraudDetectionPage, AdminGrowthOpsPage, AdminIntegrationHealthPage,
  AdminKycReviewPage, AdminLabHubPage, AdminMapErrorDashboardPage, AdminMarketplaceOpsPage,
  AdminMasterControlPage, AdminApprovalsPage, AdminAgentsPage, AdminAgentRunsPage, AdminControlShellPage, AdminMerchantApprovalQueuePage, AdminMerchantHealthPage,
  AdminNotificationLabPage, AdminNotificationOpsPage, AdminOpsDashboardPage, AdminOrderWatchPage,
  AdminPaymentsOpsPage, AdminPerformanceLabPage, AdminPipelinePage, AdminPlatformHealthPage,
  AdminQualityOpsPage, AdminRealtimeControlPage, AdminRefundQueuePage, AdminReleaseHistoryPage,
  AdminRetentionOpsPage, AdminReviewQueuePage, AdminSecurityLabPage, AdminSeedToolsPage,
  AdminShopImportPage, AdminShopQualityPage, AdminSourceAuditPage, AdminSuperDashboardPage,
  AdminSupportOpsPage, AdminSupportSlaPage, AdminSystemHealthPage, AdminUiEnginePage,
  AdminUserLookupPage, AdminWalletDiagnosticsPage, AdminWiringHealthPage, ArchitectureMapPage,
  AuditCenterPage, CommandCenterPage, CommandControlDashboard, DeliveryProofPage, DeployCenterPage,
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

      {/* ══ Admin ══ */}
      <Route path="/admin" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDashboard /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/control-room" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminControlRoomPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/engine-control-room" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><EngineControlRoomPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/engines" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminEnginesDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/wiring-health" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminWiringHealthPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/autonomy" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminAutonomyDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
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
      <Route path="/admin/execution-proof" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><ExecutionProofPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/review-queue" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminReviewQueuePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/growth-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminGrowthOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/qr-generate" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><QrGeneratePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/master-control" element={<SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminMasterControlPage /></FeatureErrorBoundary></SuperAdminGate>} />
      <Route path="/admin/ui-engine" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminUiEnginePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/marketplace-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMarketplaceOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/pipeline" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminPipelinePage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/ai-control-center" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminAIControlCenter /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/support-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminSupportOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/delivery-ops" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDeliveryOpsPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/merchant-health" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMerchantHealthPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/merchant-approval-queue" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMerchantApprovalQueuePage /></FeatureErrorBoundary></ProtectedRoute>} />
      {/* L5 Sovereign Agent Control · cross-agent approvals inbox (#812). Behind SuperAdminGate so reviewer set stays small. */}
      <Route path="/admin/approvals" element={<SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminApprovalsPage /></FeatureErrorBoundary></SuperAdminGate>} />
      {/* L4 Sovereign Agent Control · /admin/agents cockpit (#813). Reads v_agents_overview + v_agent_health, writes via system.set_agent_status RPC. */}
      <Route path="/admin/agents" element={<SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminAgentsPage /></FeatureErrorBoundary></SuperAdminGate>} />
      {/* LB1 (#815) · Per-agent conversation explorer (prompt/response/cost/latency + sensitive-output release). */}
      <Route path="/admin/agents/:slug/runs" element={<SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminAgentRunsPage /></FeatureErrorBoundary></SuperAdminGate>} />
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
      <Route path="/admin/map-errors" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminMapErrorDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/data-quality" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDataQualityPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/command-control" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><CommandControlDashboard /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/food-checkout" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><FoodOrderCheckoutPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/delivery-proof/:orderId" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><DeliveryProofPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/kyc" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminKycReviewPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/super-dashboard" element={<SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminSuperDashboardPage /></FeatureErrorBoundary></SuperAdminGate>} />
      <Route path="/admin/dld-backfill" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminDldBackfillPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/command-center" element={<SuperAdminGate><FeatureErrorBoundary featureName="Admin"><CommandCenterPage /></FeatureErrorBoundary></SuperAdminGate>} />

      {/* ACP · /admin/control unified shell (#861).
          Sensitive sections (agents/runs/command/approvals/master) are wrapped
          ProtectedRoute > SuperAdminGate so non-admins still see the shared
          AdminAccessDenied screen and admins fall through to SuperAdminGate.
          Explicit paths take precedence over the `:section` catch-all (v6). */}
      <Route path="/admin/control" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminControlShellPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/admin/control/agents" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminControlShellPage /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/runs" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminControlShellPage /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/command" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminControlShellPage /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/approvals" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminControlShellPage /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/master" element={<ProtectedRoute><SuperAdminGate><FeatureErrorBoundary featureName="Admin"><AdminControlShellPage /></FeatureErrorBoundary></SuperAdminGate></ProtectedRoute>} />
      <Route path="/admin/control/:section" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><AdminControlShellPage /></FeatureErrorBoundary></ProtectedRoute>} />

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
      <Route path="/admin/statement" element={<ProtectedRoute><FeatureErrorBoundary featureName="Admin"><StatementDashboardPage /></FeatureErrorBoundary></ProtectedRoute>} />
      <Route path="/developer-portal/docs" element={<ProtectedRoute><FeatureErrorBoundary featureName="Dashboard"><DeveloperPortalDocs /></FeatureErrorBoundary></ProtectedRoute>} />

    </>
  );
}
