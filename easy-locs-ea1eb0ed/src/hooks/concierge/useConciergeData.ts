/**
 * useConciergeData — Data loading, realtime sync, and mutations for ConciergeServices.
 * Pure data hook, zero UI. All DB calls via concierge.repository.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEnsureOrg } from "@/hooks/useEnsureOrg";
import { computeExchangeRate } from "@/hooks/useCurrencyConversion";
import { toast } from "sonner";
import {
  fetchConciergeServices, fetchConciergeOrders, upsertConciergeService,
  deleteConciergeService, updateConciergeOrderStatus, markConciergeOrderPaid,
  fetchLandlordProfile, fetchPreferredCurrency, updatePreferredCurrency,
  subscribeConciergeOrders,
} from "@/repositories/concierge.repository";

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

const emptyForm: ServiceForm = {
  category: "transfer", title: "", description: "", price: 0, currency: "EUR",
  duration_minutes: null, provider_name: "", provider_phone: "", country: "", city: "",
  active: true, photo_urls: [], location: "", conditions: "", booking_type: "instant",
  payment_methods: ["stripe"], bank_details: {}, commission_type: "percentage",
  commission_amount: 0, paypal_email: "", booking_slug: "",
  time_slots: [], blocked_dates: [], requires_id_document: false,
};

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);

export function useConciergeData() {
  const { user, orgId } = useAuth();
  const { ensureOrg, creating: creatingOrg } = useEnsureOrg();
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [landlordProfile, setLandlordProfile] = useState<any>(null);
  const [preferredCurrency, setPreferredCurrency] = useState("EUR");

  useEffect(() => {
    if (!orgId || !user) return;
    fetchLandlordProfile(orgId).then(data => { if (data) setLandlordProfile(data); });
    fetchPreferredCurrency(user.id).then(cur => setPreferredCurrency(cur));
  }, [orgId, user]);

  const load = useCallback(async () => {
    if (!orgId) return;
    const [s, o] = await Promise.all([
      fetchConciergeServices(orgId),
      fetchConciergeOrders(orgId),
    ]);
    setServices(s);
    setOrders(o);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!orgId) return;
    return subscribeConciergeOrders(orgId, () => load());
  }, [orgId, load]);

  const saveService = async (form: ServiceForm, editingId: string | null) => {
    const resolvedOrgId = orgId || await ensureOrg();
    if (!resolvedOrgId || !user || !form.title) {
      if (!resolvedOrgId) toast.error("Impossible de créer votre espace. Veuillez vous reconnecter.");
      return;
    }
    const slug = form.booking_slug || generateSlug(form.title);
    const record: any = {
      ...form, org_id: resolvedOrgId, user_id: user.id, booking_slug: slug,
      photo_urls: form.photo_urls, time_slots: form.time_slots,
      blocked_dates: form.blocked_dates, payment_methods: form.payment_methods,
      bank_details: form.bank_details,
    };
    await upsertConciergeService(record, editingId);
    toast.success(editingId ? "Service updated" : "Service created");
    await load();
  };

  const removeService = async (id: string) => {
    await deleteConciergeService(id);
    toast.success("Service deleted");
    await load();
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    await updateConciergeOrderStatus(orderId, status);
    toast.success(`Order ${status}`);

    try {
      const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine");
      await resolveNotificationsForTarget("concierge_order", orderId, user?.id);
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
          orgId: order.org_id, senderId: user?.id, recipientEmail: order.guest_email,
          subject: `Order ${status}: ${svc?.title || "Service"}`,
          message: `Your order for ${svc?.title || "Service"} on ${order.service_date || "—"} has been ${status}. Total: ${order.total_price} ${order.currency || "EUR"}.`,
          category: "booking", meta,
        });
      } catch (e) { console.error("Status notification error:", e); }
    }
    await load();
  };

  const markPaid = async (orderId: string) => {
    await markConciergeOrderPaid(orderId);
    toast.success("Payment confirmed");
    try {
      const { resolveNotificationsForTarget } = await import("@/lib/shared/notification-engine");
      await resolveNotificationsForTarget("concierge_order", orderId, user?.id);
    } catch (e) { console.error("[resolve-notif]", e); }
    await load();
  };

  const handlePreferredCurrencyChange = async (cur: string) => {
    setPreferredCurrency(cur);
    if (user) await updatePreferredCurrency(user.id, cur);
  };

  const kpis = useMemo(() => {
    const activeServices = services.filter(s => s.active).length;
    const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "awaiting_payment").length;
    const totalRevenue = orders.filter(o => o.payment_status === "paid").reduce((s: number, o: any) => {
      const cur = (o.currency || "EUR").toUpperCase();
      return s + Number(o.total_price || 0) * computeExchangeRate(cur, preferredCurrency);
    }, 0);
    const commissionEarned = orders.filter(o => o.payment_status === "paid").reduce((s: number, o: any) => {
      const cur = (o.currency || "EUR").toUpperCase();
      return s + Number(o.commission_amount || 0) * computeExchangeRate(cur, preferredCurrency);
    }, 0);
    const completedCount = orders.filter(o => o.status === "completed").length;
    const pendingPayments = orders.filter(o => o.payment_status !== "paid" && o.status !== "cancelled").length;
    return { activeServices, pendingOrders, totalRevenue, commissionEarned, completedCount, pendingPayments };
  }, [services, orders, preferredCurrency]);

  const showcaseUrl = landlordProfile?.slug ? `/showcase/${landlordProfile.slug}` : null;

  return {
    services, orders, loading, preferredCurrency, showcaseUrl, kpis,
    load, saveService, removeService, updateOrderStatus: handleUpdateOrderStatus, markPaid,
    handlePreferredCurrencyChange, emptyForm, creatingOrg,
  };
}

export type { ServiceForm };
export { emptyForm };
