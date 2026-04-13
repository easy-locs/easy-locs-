/**
 * Organization Payment Request Utility
 * 
 * Generates payment requests that use the org's own payment configuration
 * and logs them into the Communication Center.
 * 
 * Easy-Locs never collects operational payments — clients pay orgs directly.
 */
import { db as supabase } from "@/services/db";
import { sendCommunicationEvent } from "./communication-pipeline";
import { createDeepLinkMeta } from "./notification-engine";

export interface PaymentRequestParams {
  orgId: string;
  senderId: string;
  recipientEmail: string;
  recipientName: string;
  amount: number;
  currency: string;
  description: string;
  contextType: string;
  contextId: string;
  /** Optional: override org default provider */
  provider?: string;
}

export interface OrgPaymentConfig {
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  paypal_email: string | null;
  bank_holder_name: string | null;
  bank_iban: string | null;
  bank_bic: string | null;
  bank_name: string | null;
  payment_link_url: string | null;
  default_payment_provider: string | null;
}

/**
 * Fetch the payment configuration for an organization.
 */
export async function getOrgPaymentConfig(orgId: string): Promise<OrgPaymentConfig | null> {
  const { data } = await supabase
    .from("orgs")
    .select("stripe_account_id, stripe_onboarding_complete, paypal_email, bank_holder_name, bank_iban, bank_bic, bank_name, payment_link_url, default_payment_provider")
    .eq("id", orgId)
    .single();

  return data as OrgPaymentConfig | null;
}

/**
 * Build a human-readable payment instruction block based on org config.
 */
export function buildPaymentInstructions(config: OrgPaymentConfig, amount: number, currency: string): string {
  const lines: string[] = [];
  const cur = currency.toUpperCase();

  const provider = config.default_payment_provider || "stripe";

  if (provider === "stripe" && config.stripe_account_id && config.stripe_onboarding_complete) {
    lines.push(`💳 Pay ${amount} ${cur} by card — a secure Stripe payment link will be generated.`);
  }

  if (provider === "payment_link" && config.payment_link_url) {
    lines.push(`🔗 Pay via: ${config.payment_link_url}`);
  }

  if (provider === "bank_transfer" && config.bank_iban) {
    lines.push(`🏦 Bank Transfer — ${amount} ${cur}`);
    if (config.bank_holder_name) lines.push(`  Holder: ${config.bank_holder_name}`);
    if (config.bank_name) lines.push(`  Bank: ${config.bank_name}`);
    lines.push(`  IBAN: ${config.bank_iban}`);
    if (config.bank_bic) lines.push(`  BIC: ${config.bank_bic}`);
  }

  if (provider === "paypal" && config.paypal_email) {
    lines.push(`📧 PayPal: Send ${amount} ${cur} to ${config.paypal_email}`);
  }

  // Fallback: show all available methods if primary isn't fully configured
  if (lines.length === 0) {
    if (config.stripe_account_id && config.stripe_onboarding_complete) {
      lines.push(`💳 Card payment available via Stripe.`);
    }
    if (config.bank_iban) {
      lines.push(`🏦 Wire transfer: IBAN ${config.bank_iban}`);
    }
    if (config.payment_link_url) {
      lines.push(`🔗 Payment link: ${config.payment_link_url}`);
    }
    if (config.paypal_email) {
      lines.push(`📧 PayPal: ${config.paypal_email}`);
    }
    if (lines.length === 0) {
      lines.push(`⚠️ No payment method configured. Please contact the organization.`);
    }
  }

  return lines.join("\n");
}

/**
 * Create a payment request and log it in the Communication Center.
 * This does NOT process payment — it sends payment instructions to the client.
 */
export async function createPaymentRequest(params: PaymentRequestParams): Promise<{ success: boolean; instructions: string }> {
  const config = await getOrgPaymentConfig(params.orgId);
  if (!config) {
    return { success: false, instructions: "Organization not found." };
  }

  const instructions = buildPaymentInstructions(config, params.amount, params.currency);

  const meta = createDeepLinkMeta({
    targetType: params.contextType as any,
    targetId: params.contextId,
    module: "payment" as any,
    countryCode: "",
  });

  // Send the payment request via the communication pipeline
  await sendCommunicationEvent({
    orgId: params.orgId,
    senderId: params.senderId,
    recipientEmail: params.recipientEmail,
    subject: `💳 Payment request — ${params.amount} ${params.currency.toUpperCase()}`,
    message: `Hello ${params.recipientName},\n\n${params.description}\n\nAmount: ${params.amount} ${params.currency.toUpperCase()}\n\n${instructions}`,
    category: "payment",
    meta,
  });

  return { success: true, instructions };
}
