/**
 * useRentalNotifications — Extracted from RentalManagement.tsx
 * Handles rent call notifications via email + in-app.
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/country-config";
import { buildAppUrl } from "@/lib/app-domain";
import type { Tenant, RentCall } from "@/hooks/useRentalData";

const escapeEmailHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

export function useRentalNotifications(tenants: Tenant[], userCountry: string) {
  const { orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const fmt = (n: number) => formatCurrency(n, userCountry);
  const [notifyingRentId, setNotifyingRentId] = useState<string | null>(null);
  const [invitingTenantId, setInvitingTenantId] = useState<string | null>(null);

  const handleNotifyRentCall = useCallback(async (payment: RentCall) => {
    const tenant = tenants.find(t => t.id === payment.tenant_id);
    if (!tenant?.email) {
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
            <p style="color:#888;font-size:12px;text-align:center;">${escapeEmailHtml(t("page.rental.email_auto_footer"))}</p>
          </div>`,
        },
      });
      if (error || (data && data.success === false)) {
        throw error || new Error(data?.error || "error");
      }

      if (tenant.tenant_user_id && orgId) {
        await supabase.from("app_notifications").insert({
          user_id: tenant.tenant_user_id,
          org_id: orgId,
          type: "payment",
          title: t("page.rental.rent_call_notif"),
          message: `${t("page.rental.rent_call_notif")} ${payment.month} : ${fmt(payment.total_amount)}`,
          link: "/tenant/pay",
        });
      }

      toast({ title: t("page.rental.notif_sent"), description: `${t("page.rental.email_sent_to")} ${tenant.email}` });
    } catch (err: any) {
      toast({ title: t("page.rental.error"), description: err.message, variant: "destructive" });
    } finally {
      setNotifyingRentId(null);
    }
  }, [tenants, orgId, toast, t, fmt]);

  return { notifyingRentId, invitingTenantId, setInvitingTenantId, handleNotifyRentCall };
}
