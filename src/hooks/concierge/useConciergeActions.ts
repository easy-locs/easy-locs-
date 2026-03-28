/**
 * useConciergeActions — All concierge mutations extracted from ConciergeServices.
 * Single responsibility: save/edit/delete services, update orders, mark paid.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface ServiceForm {
  category: string; title: string; description: string; price: number; currency: string;
  duration_minutes: number | null; provider_name: string; provider_phone: string;
  country: string; city: string; active: boolean; photo_urls: string[];
  location: string; conditions: string; booking_type: string;
  payment_methods: string[]; bank_details: any; commission_type: string; commission_amount: number;
  paypal_email: string; booking_slug: string;
  time_slots: { start: string; end: string }[]; blocked_dates: string[];
  requires_id_document: boolean;
}

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);

export function useConciergeActions(
  userId: string | undefined,
  orgId: string | undefined | null,
  ensureOrg: () => Promise<string | undefined>,
  services: any[],
  orders: any[],
  reload: () => Promise<void>,
) {
  const { t } = useI18n();

  const saveService = useCallback(async (form: ServiceForm, editingId: string | null) => {
    const resolvedOrgId = orgId || await ensureOrg();
    if (!resolvedOrgId || !userId || !form.title) {
      if (!resolvedOrgId) toast.error("Impossible de créer votre espace. Veuillez vous reconnecter.");
      return false;
    }
    const slug = form.booking_slug || generateSlug(form.title);
    const record: any = {
      ...form, org_id: resolvedOrgId, user_id: userId, booking_slug: slug,
      photo_urls: form.photo_urls, time_slots: form.time_slots,
      blocked_dates: form.blocked_dates, payment_methods: form.payment_methods,
      bank_details: form.bank_details,
    };
    if (editingId) {
      await supabase.from("concierge_services").update(record).eq("id", editingId);
      toast.success(t("page.concierge.service_updated") || "Service updated");
    } else {
      await supabase.from("concierge_services").insert(record);
      toast.success(t("page.concierge.service_created") || "Service created");
    }
    await reload();
    return true;
  }, [orgId, userId, ensureOrg, reload, t]);

  const deleteService = useCallback(async (id: string) => {
    await supabase.from("concierge_services").delete().eq("id", id);
    toast.success(t("page.concierge.service_deleted") || "Service deleted");
    await reload();
  }, [reload, t]);

  const updateOrderStatus = useCallback(async (orderId: string, status: string) => {
    const updates: any = { status };
    if (status === "confirmed") updates.confirmed_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    if (status === "refunded") updates.refunded_at = new Date().toISOString();
    await supabase.from("concierge_orders").update(updates).eq("id", orderId);
    toast.success(t("page.concierge.order_status_updated") || `Order ${status}`);

    try {
      const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine");
      await resolveNotificationsForTarget("concierge_order", orderId, userId);
    } catch (e) { console.error("[resolve-notif]", e); }

    const order = orders.find((o: any) => o.id === orderId);
    if (order?.guest_email) {
      const svc = services.find(s => s.id === order.service_id);
      try {
        const { sendCommunicationEvent, createDeepLinkMeta } = await import("@/lib/shared");
        const meta = createDeepLinkMeta({
          targetType: "concierge_order", targetId: orderId, module: "marketplace",
          countryCode: svc?.country || "", bookingId: orderId,
          orgId: order.org_id, propertyId: order.property_id,
        });
        await sendCommunicationEvent({
          orgId: order.org_id, senderId: userId, recipientEmail: order.guest_email,
          subject: `Order ${status}: ${svc?.title || "Service"}`,
          message: `Your order for ${svc?.title || "Service"} on ${order.service_date || "—"} has been ${status}. Total: ${order.total_price} ${order.currency || "EUR"}.`,
          category: "booking", meta,
        });
      } catch (e) { console.error("Status notification error:", e); }
    }
    await reload();
  }, [orders, services, userId, reload, t]);

  const markPaid = useCallback(async (orderId: string) => {
    await supabase.from("concierge_orders").update({ payment_status: "paid" } as any).eq("id", orderId);
    toast.success(t("page.concierge.payment_confirmed") || "Payment confirmed");
    try {
      const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine");
      await resolveNotificationsForTarget("concierge_order", orderId, userId);
    } catch (e) { console.error("[resolve-notif]", e); }
    await reload();
  }, [userId, reload, t]);

  return { saveService, deleteService, updateOrderStatus, markPaid };
}

export type { ServiceForm };
