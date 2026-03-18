/**
 * API Architecture Hooks — Future-ready structure for:
 * - Company integrations (ERP, CRM, logistics)
 * - Government services (ID verification, tax, permits)
 * - Utility providers (bills, telecom, energy)
 *
 * These are interface contracts only. No implementation yet.
 * When ready, each integration will be an Edge Function behind these hooks.
 */

/* ── Integration types ──────────────────────────────────────── */

export type IntegrationCategory = "company" | "government" | "utility" | "payment_gateway" | "logistics";

export interface IntegrationConfig {
  id: string;
  name: string;
  category: IntegrationCategory;
  /** Base URL for the external API */
  baseUrl: string;
  /** Auth method: api_key, oauth2, certificate */
  authMethod: "api_key" | "oauth2" | "certificate" | "none";
  /** Which countries this integration is available in */
  countries: string[];
  /** Whether this integration is active */
  active: boolean;
}

export interface IntegrationRequest {
  integrationId: string;
  action: string;
  payload: Record<string, unknown>;
  /** Caller's org_id for multi-tenant routing */
  orgId?: string;
  /** Country context for localised routing */
  country?: string;
}

export interface IntegrationResponse {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: string;
  /** HTTP status from the external API */
  externalStatus?: number;
}

/* ── Payment gateway hooks ──────────────────────────────────── */

export interface PaymentGatewayCapabilities {
  supportsApplePay: boolean;
  supportsGooglePay: boolean;
  supportsQrPay: boolean;
  supportsNfc: boolean;
  supportedCurrencies: string[];
  supportedCountries: string[];
}

/** Future: resolve which payment methods are available for a given country */
export function getPaymentCapabilities(_country: string): PaymentGatewayCapabilities {
  // Placeholder — will query edge function or config table
  return {
    supportsApplePay: true,
    supportsGooglePay: true,
    supportsQrPay: true,
    supportsNfc: false, // future
    supportedCurrencies: ["EUR", "USD", "AED", "GBP", "CNY", "JPY"],
    supportedCountries: ["*"],
  };
}

/* ── Government service hooks ───────────────────────────────── */

export interface GovServiceType {
  id: string;
  label: string;
  /** e.g. "id_verification", "tax_filing", "business_permit" */
  serviceType: string;
  country: string;
  requiresAuth: boolean;
}

/** Future: list available government services for a country */
export function getGovServices(_country: string): GovServiceType[] {
  // Placeholder — will be populated per-country
  return [];
}

/* ── Utility bill hooks ─────────────────────────────────────── */

export interface UtilityProvider {
  id: string;
  name: string;
  type: "electricity" | "water" | "gas" | "telecom" | "internet";
  country: string;
  billPayEnabled: boolean;
}

/** Future: list utility providers for a country */
export function getUtilityProviders(_country: string): UtilityProvider[] {
  return [];
}

/* ── Generic integration dispatcher ─────────────────────────── */

/** 
 * Future: dispatch an integration request to the appropriate edge function.
 * This will be the single entry point for all external API calls.
 */
export async function dispatchIntegration(_request: IntegrationRequest): Promise<IntegrationResponse> {
  // Will call: supabase.functions.invoke("integration-gateway", { body: request })
  return { ok: false, error: "Integration gateway not yet implemented" };
}
