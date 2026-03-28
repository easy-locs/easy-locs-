/**
 * useRentalRentCalls — Extracted from RentalManagement.tsx
 * Handles: Stripe payments, rent call notifications, auto-generation.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";
import { formatCurrency, getCountryConfig } from "@/lib/country-config";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";

const escapeEmailHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const normalizeEmail = (email: string | null | undefined) => (email || "").trim().toLowerCase();
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function useRentalRentCalls() {
  const { user, orgId, userCountry } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const fmt = useCallback((n: number) => formatCurrency(n, userCountry), [userCountry]);
  const cc = getCountryConfig(userCountry);
  const L = cc.labels;

  const [payingRentId, setPayingRentId] = useState<string | null>(null);
  const [notifyingRentId, setNotifyingRentId] = useState<string | null>(null);

  const handlePayRent = useCallback(async (payment: any, tenantName: string) => {
    if (!orgId) return;
    setPayingRentId(payment.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-rent-payment", {
        body: { rentCallId: payment.id, amount: payment.total_amount, tenantName, month: payment.month, orgId },
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
  }, [orgId, t, toast]);

  const handleNotifyRentCall = useCallback(async (payment: any, tenant: { id: string; email: string; tenant_user_id?: string | null; name: string }) => {
    if (!tenant.email) {
      toast({ title: t("page.rental.error"), description: t("page.rental.no_tenant_email"), variant: "destructive" });
      return;
    }
    setNotifyingRentId(payment.id);
    try {
      const appUrl = buildAppUrl("/");
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: tenant.email,
          subject: `${t("page.rental.rent_call_notif")} — ${payment.month}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
            <h2 style="color:#1a1a1a;text-align:center;">${escapeEmailHtml(t("page.rental.email_rent_call_title"))}</h2>
            <p style="color:#555;font-size:15px;">${escapeEmailHtml(t("page.rental.rent_call_hello"))} ${escapeEmailHtml(tenant.name)},</p>
            <p style="color:#555;font-size:15px;">${escapeEmailHtml(t("page.rental.rent_call_reminder"))} <strong>${payment.month}</strong> :</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin:16px 0;">
              <p style="margin:4px 0;font-size:14px;color:#333;">${escapeEmailHtml(t("page.rental.email_rent_label"))} : <strong>${fmt(payment.rent_amount)}</strong></p>
              <p style="margin:4px 0;font-size:14px;color:#333;">${escapeEmailHtml(t("page.rental.email_charges_label"))} : <strong>${fmt(payment.charges_amount)}</strong></p>
              <p style="margin:8px 0 0;font-size:16px;color:#1a1a1a;font-weight:700;">${escapeEmailHtml(t("page.rental.email_total_label"))} : ${fmt(payment.total_amount)}</p>
            </div>
            <div style="text-align:center;margin:24px 0;">
              <a href="${appUrl}/tenant/pay" style="display:inline-block;background:#d4a853;color:#1a1a1a;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;">${escapeEmailHtml(t("page.rental.pay_rent_btn"))}</a>
            </div>
          </div>`,
        },
      });
      if (error || (data && data.success === false)) throw error || new Error(data?.error || "error");

      if (tenant.tenant_user_id && orgId) {
        await supabase.from("app_notifications").insert({
          user_id: tenant.tenant_user_id, org_id: orgId, type: "payment",
          title: t("page.rental.rent_call_notif"),
          message: `${t("page.rental.rent_call_notif")} ${payment.month} : ${fmt(payment.total_amount)}`,
          link: "/tenant/pay",
        });
      }
      platformBus.emit(APP_EVENTS.RENTAL_RENT_CALL_CREATED as any, { rentCallId: payment.id }, "rental");
      toast({ title: t("page.rental.notif_sent"), description: `${t("page.rental.email_sent_to")} ${tenant.email}` });
    } catch (err: any) {
      toast({ title: t("page.rental.error"), description: err.message, variant: "destructive" });
    } finally {
      setNotifyingRentId(null);
    }
  }, [orgId, t, toast, fmt]);

  const autoGenerateFirstRentCall = useCallback(async (tenantId: string, form: any, properties: any[]) => {
    if (!orgId || !user || !form.property_id) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    try {
      const { data: inserted } = await supabase.from("rent_calls").insert({
        org_id: orgId, tenant_id: tenantId, property_id: form.property_id, month,
        rent_amount: form.rent_amount || 0, charges_amount: form.charges_amount || 0,
        total_amount: (form.rent_amount || 0) + (form.charges_amount || 0), paid: false,
      }).select("id").single();
      toast({ title: L.monthCalls, description: `${month} — ${fmt((form.rent_amount || 0) + (form.charges_amount || 0))}` });

      if (inserted?.id) {
        const prop = properties.find((p: any) => p.id === form.property_id);
        dispatchSyncEvent({
          type: "rent_call_created",
          context: { orgId, propertyId: form.property_id, tenantId, countryCode: prop?.country || "" },
          actorUserId: user.id, month,
          totalAmount: (form.rent_amount || 0) + (form.charges_amount || 0),
          currency: "EUR", tenantName: form.name, propertyLabel: prop?.label || "",
          rentCallId: inserted.id,
        }).catch(() => {});
        platformBus.emit(APP_EVENTS.RENTAL_RENT_CALL_CREATED as any, { rentCallId: inserted.id }, "rental");
      }
    } catch { /* ignore duplicate */ }
  }, [orgId, user, fmt, L, toast]);

  return {
    payingRentId, notifyingRentId,
    handlePayRent, handleNotifyRentCall, autoGenerateFirstRentCall,
  };
}
