/**
 * useSeasonalRequestActions — Booking request mutations.
 * Delegates to seasonal.repository.ts (single source of truth).
 */
import { useCallback, useState } from "react";
import * as seasonalRepo from "@/repositories/seasonal.repository";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { buildAppUrl } from "@/lib/app-domain";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";

interface UseSeasonalRequestActionsParams {
  properties: { id: string; label: string; country?: string }[];
  reload: () => Promise<void>;
}

export function useSeasonalRequestActions({ properties, reload }: UseSeasonalRequestActionsParams) {
  const { user, orgId } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [payingRequest, setPayingRequest] = useState<string | null>(null);

  const approveRequest = useCallback(async (req: any) => {
    await seasonalRepo.updateBookingRequestStatus(req.id, "approved");
    try { const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine"); await resolveNotificationsForTarget("booking_request", req.id, user?.id); } catch (e) { console.error("[resolve-notif]", e); }
    if (orgId && user) {
      await seasonalRepo.saveSeasonalBooking({
        org_id: orgId, user_id: user.id, property_id: req.property_id,
        guest_name: req.guest_name, guest_email: req.guest_email, guest_phone: req.guest_phone || "",
        check_in: req.check_in, check_out: req.check_out, total_price: 0, cleaning_fee: 0, deposit_amount: 0,
        notes: req.message || "",
      }, null);
    }
    const listingData = await seasonalRepo.fetchListingById(req.listing_id);
    const nights = Math.max(1, Math.ceil((new Date(req.check_out).getTime() - new Date(req.check_in).getTime()) / 86400000));
    const pricePerNight = listingData?.price_per_night || 0;
    const totalAmount = pricePerNight * nights;
    const payUrl = buildAppUrl(`/listing/${listingData?.slug}?pay_request=${req.id}&email=${encodeURIComponent(req.guest_email)}&name=${encodeURIComponent(req.guest_name)}&amount=${totalAmount}&nights=${nights}`);
    await seasonalRepo.invokeSendEmail({
      to: req.guest_email,
      subject: `✅ ${t("page.seasonal.approved_subject")} — ${listingData?.title || ""}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
        <h2 style="color:#1a1a1a;text-align:center;">✅ ${t("page.seasonal.approved_heading")}</h2>
        <p style="color:#555;font-size:15px;text-align:center;">${t("page.seasonal.approved_body").replace("{name}", req.guest_name).replace("{checkin}", req.check_in).replace("{checkout}", req.check_out)}</p>
        <p style="text-align:center;margin:24px 0;"><a href="${payUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;">💳 ${t("page.seasonal.pay_now_btn")} — ${totalAmount}€</a></p>
        <p style="text-align:center;color:#aaa;font-size:11px;">EASY-LOCS®</p>
      </div>`,
    });
    toast({ title: t("page.seasonal.request_approved") });
    await reload();
    return { ...req, status: "approved" };
  }, [orgId, user, t, toast, reload]);

  const rejectRequest = useCallback(async (req: any) => {
    await seasonalRepo.updateBookingRequestStatus(req.id, "rejected");
    try { const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine"); await resolveNotificationsForTarget("booking_request", req.id, user?.id); } catch (e) { console.error("[resolve-notif]", e); }
    await seasonalRepo.invokeSendEmail({
      to: req.guest_email, subject: `❌ ${t("page.seasonal.rejected_email_subject")}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
        <h2 style="color:#1a1a1a;text-align:center;">❌ ${t("page.seasonal.rejected_email_heading")}</h2>
        <p style="color:#555;font-size:15px;text-align:center;">${t("page.seasonal.rejected_email_body").replace("{name}", req.guest_name).replace("{checkin}", req.check_in).replace("{checkout}", req.check_out)}</p>
        <p style="text-align:center;color:#aaa;font-size:11px;">EASY-LOCS®</p>
      </div>`,
    });
    toast({ title: t("page.seasonal.request_rejected") });
    return { ...req, status: "rejected" };
  }, [user, t, toast]);

  const cancelRequest = useCallback(async (req: any) => {
    await seasonalRepo.updateBookingRequestStatus(req.id, "cancelled");
    if (orgId) { await seasonalRepo.deleteSeasonalBookingByMatch(orgId, req.property_id, req.check_in, req.check_out, req.guest_name); }
    await seasonalRepo.invokeSendEmail({
      to: req.guest_email, subject: `🚫 ${t("page.seasonal.cancelled_email_subject")}`,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
        <h2 style="color:#dc2626;text-align:center;">🚫 ${t("page.seasonal.cancelled_email_heading")}</h2>
        <p style="color:#555;font-size:15px;text-align:center;">${t("page.seasonal.cancelled_email_body").replace("{name}", req.guest_name).replace("{checkin}", req.check_in).replace("{checkout}", req.check_out)}</p>
        <p style="text-align:center;color:#aaa;font-size:11px;">EASY-LOCS®</p>
      </div>`,
    });
    toast({ title: t("page.seasonal.request_cancelled") });
    await reload();
  }, [orgId, t, toast, reload]);

  const deleteRequest = useCallback(async (reqId: string) => {
    await seasonalRepo.deleteBookingRequest(reqId);
    toast({ title: t("page.seasonal.booking_deleted") });
    await reload();
  }, [t, toast, reload]);

  const generatePaymentLink = useCallback(async (req: any) => {
    setPayingRequest(req.id);
    try {
      const listingData = await seasonalRepo.fetchListingById(req.listing_id);
      const nights = Math.max(1, Math.ceil((new Date(req.check_out).getTime() - new Date(req.check_in).getTime()) / 86400000));
      const pricePerNight = listingData?.price_per_night || 0;
      const totalAmount = pricePerNight * nights;
      const stripeData = await seasonalRepo.invokeBookingPayment({
        booking_request_id: req.id, listing_id: req.listing_id,
        guest_email: req.guest_email, guest_name: req.guest_name,
        amount: totalAmount, nights, property_label: listingData?.title || "", origin: window.location.origin,
      });
      await seasonalRepo.updateBookingRequestStatus(req.id, "payment_pending");
      if (stripeData?.url) {
        await seasonalRepo.invokeSendEmail({
          to: req.guest_email, subject: `💳 Payment — ${listingData?.title || ""}`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
            <h2 style="color:#1a1a1a;text-align:center;">💳 ${t("page.seasonal.pay_now_btn")}</h2>
            <p style="color:#555;font-size:15px;text-align:center;">${req.guest_name}, ${req.check_in} → ${req.check_out}</p>
            <p style="text-align:center;margin:24px 0;"><a href="${stripeData.url}" style="display:inline-block;background:#16a34a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;">💳 ${t("page.seasonal.pay_now_btn")} — ${totalAmount}€</a></p>
            <p style="text-align:center;color:#aaa;font-size:11px;">EASY-LOCS®</p>
          </div>`,
        });
      }
      const prop = properties.find((p: any) => p.id === req.property_id) as any;
      dispatchSyncEvent({
        type: "payment_request_sent",
        context: { orgId: orgId!, propertyId: req.property_id, bookingId: req.id, countryCode: prop?.country || "" },
        actorUserId: user!.id, targetEmail: req.guest_email,
        amount: totalAmount, currency: "EUR",
        description: `Payment for ${listingData?.title || ""} — ${req.check_in} → ${req.check_out}`,
        recipientName: req.guest_name,
      }).catch(() => {});
      toast({ title: "✅ Payment link generated and sent!" });
      await reload();
    } catch (err: any) { toast({ title: t("page.common.error"), description: err.message || "Payment link generation failed", variant: "destructive" }); }
    finally { setPayingRequest(null); }
  }, [orgId, user, properties, t, toast, reload]);

  return { approveRequest, rejectRequest, cancelRequest, deleteRequest, generatePaymentLink, payingRequest };
}
