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
