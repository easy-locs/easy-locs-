/**
 * useMarketplaceMutations — Extracted mutations for ActivitiesMarketplace.
 * Handles provider CRUD, service CRUD, booking submission.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEnsureOrg } from "@/hooks/useEnsureOrg";
import { checkServiceDuplicate } from "@/lib/geo/duplicateGuard";
import { assignZoneToService } from "@/lib/zones/autoAssignZone";
import { dispatchSyncEvent } from "@/lib/shared/sync-engine";
import { toast } from "sonner";
import type { ServiceFormData } from "@/components/marketplace/ServiceForm";

export function useMarketplaceMutations(
  myProvider: any,
  orgId: string | undefined,
) {
  const { user } = useAuth();
  const { ensureOrg } = useEnsureOrg();
  const qc = useQueryClient();

  const createProvider = useMutation({
    mutationFn: async (data: any) => {
      const resolvedOrgId = await ensureOrg();
      if (!resolvedOrgId) throw new Error("Impossible de créer votre espace. Veuillez vous reconnecter.");
      const slug = data.display_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      const { error } = await supabase.from("marketplace_providers").insert({ ...data, slug, user_id: user!.id, org_id: resolvedOrgId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Provider profile created!"); qc.invalidateQueries({ queryKey: ["my_marketplace_provider"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateProvider = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("marketplace_providers").update(data).eq("id", myProvider!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated!"); qc.invalidateQueries({ queryKey: ["my_marketplace_provider"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createService = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const resolvedOrgId = orgId || await ensureOrg();
      if (!resolvedOrgId) throw new Error("Organisation introuvable");
      const dupCheck = await checkServiceDuplicate(data.title, (data as any).lat ?? null, (data as any).lng ?? null, (data as any).phone ?? null);
      if (dupCheck.blocked) throw new Error(`Duplicate detected: similar service "${dupCheck.existingMatch?.name ?? "unknown"}" already exists nearby.`);
      const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
      const insertData: Record<string, unknown> = { ...data, booking_slug: slug, provider_id: myProvider!.id, org_id: resolvedOrgId, user_id: user!.id };
      const { data: created, error } = await supabase.from("marketplace_services").insert(insertData as any).select("id, lat, lng").single();
      if (error) throw error;
      if (created?.id && created.lat && created.lng) assignZoneToService(created.id, created.lat, created.lng).catch(() => {});
    },
    onSuccess: () => { toast.success("Service created!"); qc.invalidateQueries({ queryKey: ["my_marketplace_services"] }); qc.invalidateQueries({ queryKey: ["browse_marketplace_services"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateService = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ServiceFormData }) => {
      const { error } = await supabase.from("marketplace_services").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Service mis à jour !"); qc.invalidateQueries({ queryKey: ["my_marketplace_services"] }); qc.invalidateQueries({ queryKey: ["browse_marketplace_services"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Service supprimé"); qc.invalidateQueries({ queryKey: ["my_marketplace_services"] }); qc.invalidateQueries({ queryKey: ["browse_marketplace_services"] }); },
  });

  const submitBooking = useMutation({
    mutationFn: async ({ formData, service, providersMap }: { formData: any; service: any; providersMap: Record<string, any> }) => {
      const prov = providersMap[service.provider_id];
      const provOrgId = prov?.org_id || service.org_id;
      const totalPrice = formData.date_from && formData.date_to
        ? Number(service.price) * Math.max(1, Math.ceil((new Date(formData.date_to).getTime() - new Date(formData.date_from).getTime()) / 86400000))
        : Number(service.price) * (formData.quantity || 1);

      const { data: booking, error } = await supabase.from("marketplace_bookings").insert({
        service_id: service.id, provider_id: service.provider_id, org_id: provOrgId,
        booker_user_id: user?.id || null, booker_name: formData.booker_name, booker_email: formData.booker_email,
        booker_phone: formData.booker_phone, service_date: formData.service_date || formData.date_from,
        service_time: formData.service_time, date_from: formData.date_from || null, date_to: formData.date_to || null,
        quantity: formData.quantity || 1, total_price: totalPrice, currency: service.currency, notes: formData.notes,
      }).select().single();
      if (error) throw error;

      await dispatchSyncEvent({
        type: "service_booking",
        context: { orgId: provOrgId, bookingId: booking?.id, propertyId: booking?.property_id || undefined, countryCode: service.country || "" },
        actorUserId: user?.id || "", targetUserId: prov?.user_id || service.user_id, targetEmail: prov?.email,
        clientName: formData.booker_name, serviceTitle: service.title,
        serviceDate: formData.service_date || formData.date_from || "—", totalPrice, currency: service.currency,
      });

      if (formData.booker_email) {
        const { sendCommunicationEvent } = await import("@/lib/shared/communication-pipeline");
        const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
        const meta = createDeepLinkMeta({ targetType: "marketplace_booking", targetId: booking?.id || "", module: "marketplace", countryCode: service.country || "", bookingId: booking?.id, orgId: provOrgId });
        await sendCommunicationEvent({ orgId: provOrgId, recipientEmail: formData.booker_email, subject: `✅ Booking request sent: ${service.title}`, message: `Hello ${formData.booker_name},\n\nYour booking for "${service.title}" has been submitted.\nDate: ${formData.service_date || formData.date_from || "—"}\nAmount: ${totalPrice} ${service.currency}\n\nYou will be notified when the provider confirms.\n\nThank you!`, category: "info", meta });
      }
    },
    onSuccess: () => { toast.success("Demande de réservation envoyée !"); qc.invalidateQueries({ queryKey: ["my_marketplace_bookings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { createProvider, updateProvider, createService, updateService, deleteService, submitBooking };
}
