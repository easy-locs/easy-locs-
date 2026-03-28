/**
 * useRentalReceipts — Extracted from RentalManagement.tsx
 * Handles receipt generation and rent payment via Stripe.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { getCountryConfig, formatCurrency } from "@/lib/country-config";
import { generateFromTemplate, downloadPDF } from "@/lib/pdf-generator";
import { getAllTemplates } from "@/lib/templates/registry";
import { frRentReceipt } from "@/lib/templates/fr/rent-receipt";
import type { Property, Tenant, RentCall } from "@/hooks/useRentalData";

export function useRentalReceipts(
  properties: Property[],
  tenants: Tenant[],
  userCountry: string,
) {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const cc = getCountryConfig(userCountry);
  const L = cc.labels;
  const fmt = (n: number) => formatCurrency(n, userCountry);

  const [payingRentId, setPayingRentId] = useState<string | null>(null);

  const generateReceiptForPayment = useCallback(async (payment: RentCall) => {
    const tenant = tenants.find(t => t.id === payment.tenant_id);
    if (!tenant || !user) return;
    const prop = properties.find(p => p.id === tenant.property_id);

    let landlordSignature = "";
    let stampUrl = "";
    try {
      const { data: profile } = await supabase.from("profiles").select("signature_url").eq("id", user.id).single();
      if (profile?.signature_url) landlordSignature = profile.signature_url;
    } catch {}
    if (orgId) {
      try {
        const { data: orgData } = await supabase.from("orgs").select("stamp_url").eq("id", orgId).single();
        if ((orgData as any)?.stamp_url) stampUrl = (orgData as any).stamp_url;
      } catch {}
    }

    let landlordName = "";
    let landlordAddress = "";
    if (orgId) {
      try {
        const { data: ownerProfile } = await supabase.from("owner_profiles").select("full_name, address, postal_code, city").eq("org_id", orgId).limit(1).maybeSingle();
        if (ownerProfile) {
          landlordName = ownerProfile.full_name || "";
          landlordAddress = [ownerProfile.address, ownerProfile.postal_code, ownerProfile.city].filter(Boolean).join(", ");
        }
      } catch {}
    }
    if (!landlordName && orgId) {
      try {
        const { data: orgData } = await supabase.from("orgs").select("name, address, postal_code, city").eq("id", orgId).single();
        if (orgData) {
          landlordName = orgData.name || "";
          if (!landlordAddress) landlordAddress = [orgData.address, orgData.postal_code, orgData.city].filter(Boolean).join(", ");
        }
      } catch {}
    }
    if (!landlordName) landlordName = user?.user_metadata?.name || t("page.rental.landlord");

    const paymentMethodLabels: Record<string, string> = {
      online: t("page.rental.payment_method_online"),
      bank_transfer: t("page.rental.payment_method_transfer"),
      cash: t("page.rental.payment_method_cash"),
    };
    const paymentMethodLabel = payment.payment_method ? (paymentMethodLabels[payment.payment_method] || payment.payment_method) : "";

    const data: Record<string, unknown> = {
      landlordName, landlordAddress,
      tenantName: tenant.name,
      tenantAddress: prop ? `${prop.address}, ${prop.postal_code} ${prop.city}` : "",
      propertyAddress: prop ? `${prop.address}, ${prop.postal_code} ${prop.city}` : "",
      rentAmount: payment.rent_amount, chargesAmount: payment.charges_amount,
      periodStart: `${payment.month}-01`,
      periodEnd: `${payment.month}-${new Date(+payment.month.split("-")[0], +payment.month.split("-")[1], 0).getDate()}`,
      paymentDate: payment.paid_date || new Date().toISOString().split("T")[0],
      paymentMethod: paymentMethodLabel,
    };

    const propCountryCode = prop?.country || userCountry;
    const allTpls = getAllTemplates();
    const receiptTemplate = allTpls.find(t => t.country === propCountryCode && t.docType === "rent-receipt" && t.active) || frRentReceipt;
    const signatures = landlordSignature ? { landlord: landlordSignature } : undefined;
    const doc = generateFromTemplate(receiptTemplate, data, signatures, stampUrl || undefined, { skipTenantSignature: true });
    downloadPDF(doc, `${L.generateReceipt.replace(/\s/g, "_")}_${tenant.name}_${payment.month}.pdf`);
    toast({ title: L.validateReceipt });
  }, [tenants, properties, user, orgId, userCountry, toast, t]);

  const handlePayRent = useCallback(async (payment: RentCall) => {
    const tenant = tenants.find(t => t.id === payment.tenant_id);
    if (!tenant || !orgId) return;
    setPayingRentId(payment.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-rent-payment", {
        body: { rentCallId: payment.id, amount: payment.total_amount, tenantName: tenant.name, month: payment.month, orgId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      const msg = err.message || String(err);
      const userMsg = msg.includes("Stripe Connect")
        ? (t("page.rental.stripe_not_configured") || "Please configure your Stripe account first in Finances → Online Payment.")
        : msg;
      toast({ title: t("page.rental.payment_error") || "Payment error", description: userMsg, variant: "destructive" });
    } finally {
      setPayingRentId(null);
    }
  }, [tenants, orgId, toast, t]);

  return { payingRentId, generateReceiptForPayment, handlePayRent };
}
