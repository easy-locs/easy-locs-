import { structuredLogger } from "@/lib/observability/structured-logger";

export interface DomainBoundaryRule {
  domain: string;
  allowed_imports: string[];
  forbidden_imports: string[];
  owns: string[];
  db_tables?: string[];
}

export const DOMAIN_BOUNDARIES: DomainBoundaryRule[] = [
  {
    domain: "wallet",
    allowed_imports: ["@/lib/wallet", "@/domains/wallet", "@/stores/walletStore", "@/lib/control-plane", "@/lib/observability", "@/lib/platform-bus"],
    forbidden_imports: ["@/integrations/supabase/client"],
    owns: ["src/domains/wallet/", "src/lib/wallet/", "src/stores/walletStore.ts", "src/pages/wallet/", "src/components/wallet/"],
    db_tables: ["wallet_accounts", "wallet_transactions", "wallet_ledger_entries", "insurance_policies", "insurance_claims"],
  },
  {
    domain: "orbit",
    allowed_imports: ["@/domains/orbit", "@/stores/orbit", "@/lib/orbit", "@/lib/call", "@/lib/e2ee", "@/lib/control-plane", "@/lib/observability", "@/lib/platform-bus"],
    forbidden_imports: ["@/integrations/supabase/client"],
    owns: ["src/domains/orbit/", "src/lib/orbit/", "src/stores/orbit/", "src/components/orbit/", "src/components/chat/", "src/components/call/"],
  },
  {
    domain: "identity",
    allowed_imports: ["@/lib/auth", "@/stores/auth.store", "@/lib/contacts", "@/lib/control-plane", "@/lib/observability", "@/lib/platform-bus"],
    forbidden_imports: [],
    owns: ["src/lib/auth/", "src/components/auth/", "src/lib/contacts/"],
  },
  {
    domain: "dashboard",
    allowed_imports: ["@/domains/cards", "@/hooks/useHomeSections", "@/lib/control-plane", "@/lib/observability", "@/lib/platform-bus"],
    forbidden_imports: ["@/integrations/supabase/client"],
    owns: ["src/components/dashboard/", "src/pages/Dashboard.tsx", "src/domains/cards/"],
  },
  {
    domain: "radar",
    allowed_imports: ["@/lib/radar", "@/lib/discovery", "@/stores/radarStore", "@/lib/control-plane", "@/lib/observability", "@/lib/platform-bus"],
    forbidden_imports: ["@/integrations/supabase/client"],
    owns: ["src/lib/radar/", "src/lib/discovery/", "src/stores/radarStore.ts", "src/pages/radar/", "src/components/radar/"],
  },
  {
    domain: "commerce",
    allowed_imports: ["@/services/bnpl.service", "@/services/e-signature.service", "@/lib/control-plane", "@/lib/observability", "@/lib/platform-bus"],
    forbidden_imports: ["@/integrations/supabase/client"],
    owns: ["src/services/bnpl.service.ts", "src/services/e-signature.service.ts"],
    db_tables: ["bookings", "transactions", "carts", "receipts", "payout_requests", "bnpl_plans", "bnpl_installments", "signing_envelopes", "signing_parties"],
  },
  {
    domain: "marketplace",
    allowed_imports: ["@/services/marketplace.service", "@/services/merchant.service", "@/lib/control-plane", "@/lib/observability", "@/lib/platform-bus"],
    forbidden_imports: ["@/integrations/supabase/client"],
    owns: ["src/services/marketplace.service.ts", "src/services/merchant.service.ts"],
  },
  {
    domain: "taxonomy",
    allowed_imports: ["@/lib/taxonomy", "@/lib/control-plane", "@/lib/observability"],
    forbidden_imports: ["@/integrations/supabase/client"],
    owns: ["src/lib/taxonomy/"],
  },
];

export const ARCHITECTURE_RULES = {
  NO_SUPABASE_IN_UI: {
    description: "UI components must never import supabase client directly. Use service layer.",
    pattern: /from\s+["']@\/integrations\/supabase\/client["']/,
    forbidden_in: ["src/components/", "src/pages/"],
    allowed_in: ["src/services/", "src/domains/", "src/lib/", "src/integrations/"],
  },
  NO_BUSINESS_LOGIC_IN_UI: {
    description: "Business-critical logic (wallet, payment, auth) must live in service/domain layer.",
    pattern: /\.(insert|update|delete|upsert)\s*\(/,
    forbidden_in: ["src/components/"],
    allowed_in: ["src/services/", "src/domains/", "src/lib/"],
  },
  NO_DIRECT_WALLET_ACCESS: {
    description: "Wallet operations must go through wallet domain service, never directly.",
    pattern: /from\s+["']@\/stores\/walletStore["']/,
    forbidden_in: ["src/components/orbit/", "src/components/radar/", "src/components/dashboard/"],
    allowed_in: ["src/components/wallet/", "src/pages/wallet/", "src/domains/wallet/"],
  },
  NO_DIRECT_DB_SERVICE_IN_PAGES: {
    description: "Page and component files must not import the low-level db service directly. Use domain services.",
    pattern: /from\s+["']@\/services\/db["']/,
    forbidden_in: ["src/components/", "src/pages/"],
    allowed_in: ["src/services/", "src/domains/", "src/lib/"],
  },
  NO_DIRECT_STORAGE_IN_UI: {
    description: "Storage operations must be routed through domain services, not called from UI.",
    pattern: /\.storage\s*\.\s*from\s*\(/,
    forbidden_in: ["src/components/", "src/pages/"],
    allowed_in: ["src/services/", "src/domains/", "src/lib/"],
  },
  NO_DIRECT_REALTIME_IN_UI: {
    description: "Realtime subscriptions must be routed through domain services, not called from UI.",
    pattern: /\.channel\s*\(|\.on\s*\(\s*["']postgres_changes["']/,
    forbidden_in: ["src/pages/"],
    allowed_in: ["src/services/", "src/domains/", "src/lib/", "src/hooks/", "src/components/"],
  },
};

export interface ArchitectureViolation {
  rule: string;
  file: string;
  description: string;
  severity: "error" | "warning";
  domain?: string;
}

const knownViolations: ArchitectureViolation[] = [
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/storefront/OrdersManager.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "marketplace" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/storefront/AuctionManager.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "marketplace" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/storefront/BuyerOrderTracker.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "marketplace" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/delivery/BuyerDeliveryDashboard.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "rider" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/delivery/FleetManagementDashboard.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "rider" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/delivery/LiveDeliveryChat.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "rider" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/merchant/MerchantPaymentHistory.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "payment" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/merchant/MerchantKitchenQueue.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "food" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/pos/KitchenQueue.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "food" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/auth/SocialLoginButtons.tsx", description: "Direct supabase import in auth UI", severity: "warning", domain: "identity" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/concierge/ServiceBookingCalendar.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "booking" },
  { rule: "NO_SUPABASE_IN_UI", file: "src/components/communication/RealtimeMessageToast.tsx", description: "Direct supabase import in UI component", severity: "error", domain: "orbit" },
];

export function getArchitectureViolations(): ArchitectureViolation[] {
  return knownViolations;
}

export function getViolationsByDomain(domain: string): ArchitectureViolation[] {
  return knownViolations.filter((v) => v.domain === domain);
}

export function getViolationCount(): { errors: number; warnings: number; total: number } {
  const errors = knownViolations.filter((v) => v.severity === "error").length;
  const warnings = knownViolations.filter((v) => v.severity === "warning").length;
  return { errors, warnings, total: knownViolations.length };
}

export function getDomainOwnership(filePath: string): string | undefined {
  for (const boundary of DOMAIN_BOUNDARIES) {
    for (const owned of boundary.owns) {
      if (filePath.startsWith(owned) || filePath.includes(owned)) {
        return boundary.domain;
      }
    }
  }
  return undefined;
}

export function checkImportViolation(
  filePath: string,
  importPath: string,
): ArchitectureViolation | null {
  for (const [ruleName, rule] of Object.entries(ARCHITECTURE_RULES)) {
    const isForbiddenLocation = rule.forbidden_in.some((prefix) => filePath.startsWith(prefix));
    const isAllowedLocation = rule.allowed_in.some((prefix) => filePath.startsWith(prefix));

    if (isForbiddenLocation && !isAllowedLocation && rule.pattern.test(importPath)) {
      return {
        rule: ruleName,
        file: filePath,
        description: rule.description,
        severity: "error",
        domain: getDomainOwnership(filePath),
      };
    }
  }
  return null;
}

export const EDGE_FUNCTION_CONSOLIDATION_MAP: Record<string, string[]> = {
  "admin-router": ["admin-payout-approve", "admin-payout-reject", "admin-trigger", "auto-onboarding-cron", "kyc-review", "audit-export", "refund-admin", "refund-process-booking", "refund-request-booking", "process-refund", "command-center-api", "command-monitoring-cron", "command-approval-webhook", "command-email-intake", "command-github-webhook", "seller-kpi-snapshot", "ops-ai-chat"],
  "ai-router": ["ai-assistant", "ai-shopping-chat", "ai-entity-enrichment", "ai-web-search", "ops-ai-chat", "classify-business", "generate-seo", "generate-cv", "extract-article", "storefront-description", "translate-message", "ai-proxy"],
  "booking-router": ["booking-create", "booking-approve", "booking-reject", "booking-complete", "booking-lifecycle", "notify-booking", "create-booking-payment", "create-concierge-payment", "export-ical", "sync-ical", "submit-review"],
  "commerce-router": ["esign-create-envelope", "esign-webhook", "order-manage", "shop-import-processor", "social-preview", "uae-scrape-onboard"],
  "food-router": ["food-audit", "food-menu-builder", "food-normalizer", "food-publish", "food-rescrape-monitor", "food-visibility-gate", "food-visual-clean", "deliveroo-dubai-food", "run-ingestion-pipeline", "deep-scrape-build", "auto-source-scrape"],
  "gdpr-router": ["gdpr-delete-account", "gdpr-deletion-processor", "gdpr-export"],
  "identity-router": ["reveal-contact", "guest-session", "generate-cv"],
  "infra-router": ["health-check", "public-health", "aws-health-check", "watchdog-ping", "engine-cron-server", "run-engine-cron", "run-scheduled-audit", "master-runtime-qa-engine", "platform-recovery", "repair-worker", "browser-user-repair-engine", "pipeline-worker", "job-queue-worker", "job-runner", "dispatch-cron", "autonomous-cron-dispatcher", "omega-server-loop", "sentinel-server", "sentinel-server-guards", "runtime-control-plane", "backup-storage", "cache-manager", "dlq-ingest", "dlq-processor", "integration-health-cron", "integration-health-monitor", "cleanup-integration-health-logs", "redis-enqueue", "redis-proxy", "uae-data-cleanup", "cleanup-expired-messages", "expire-listings", "expire-pending-referrals", "dld-analytics", "dld-sync-cron", "inngest-handler", "prayer-times", "prayer-push-cron"],
  "logistics-router": ["dispatch-delivery", "dispatch-ride", "dispatch-webhook", "order-manage"],
  "marketplace-router": ["expire-listings", "shop-import-processor", "uae-scrape-onboard"],
  "media-router": ["media-processor", "video-processor", "s3-upload-proxy", "cleanup-expired-media", "cleanup-orphan-media", "process-onboarding-media", "generate-pdf", "export-ical", "sync-ical", "rss-proxy", "scrape-proxy", "auto-source-scrape", "deep-scrape-build", "lambda-invoke-proxy", "sqs-enqueue-proxy", "fx-rates", "voice-processing", "tts-engine"],
  "notification-router": ["send-email", "send-notification-email", "send-otp", "send-push", "send-push-notification", "send-call-push", "send-sms", "notification-dispatcher", "alert-dispatcher", "email-enqueue", "email-queue-process", "receive-email", "payment-notification", "ses-webhook"],
  "orbit-router": ["orbit-payment", "translate-message"],
  "rent-router": ["rent-payment", "rent-create-payment", "rent-lifecycle-cron", "rent-reminders", "collect-sepa-rents", "lease-workflow", "tenant-signup", "generate-rent-receipt", "create-legal-notice-payment"],
  "search-router": ["search-global", "search-meilisearch", "sync-meilisearch", "sync-meilisearch-cron", "spatial-query", "generate-embeddings", "vector-embed"],
  "stripe-router": ["stripe-webhook", "stripe-connect-login", "check-connect-status", "create-connect-account", "disconnect-stripe", "create-stripe-intent", "capture-payment-intent", "create-checkout", "create-checkout-session", "create-subscription", "manage-subscription", "subscription-portal", "customer-portal", "create-guest-checkout", "create-listing-checkout", "create-storefront-checkout", "verify-guest-payment"],
  "system-router": ["(inline routes for health, metrics, analytics, firecrawl-usage, cache-metrics)"],
  "voice-router": ["voice-processing", "tts-engine", "voice-stt-token", "livekit-room-token", "get-turn-credentials", "mux-upload", "presence-heartbeat", "voice-tts", "plaid-link-token", "plaid-webhook"],
  "wallet-router": ["wallet-ops", "wallet-pin", "wallet-transfer", "commission-split", "purchase-locs", "payout-request-create", "qr-payment-session", "check-subscription", "award-loyalty-points", "orbit-payment", "crypto-payment", "crypto-webhook", "mobile-money-payment", "mobile-money-webhook", "process-referral-reward", "create-wallet-topup"],
  "webauthn-router": ["webauthn-begin-registration", "webauthn-finish-registration", "webauthn-registration-challenge", "webauthn-registration-verify", "webauthn-authentication-challenge", "webauthn-authentication-verify", "webauthn-login-challenge", "webauthn-login-verify"],
};
