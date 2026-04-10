import { navigateToOrbitThread } from "@/lib/orbit/navigate-to-thread";
import { platformBus } from "@/lib/shared/platform-bus";
import { trackOrbitEvent } from "@/lib/orbit/orbitTelemetry";
import { supabase } from "@/integrations/supabase/client";

export type EntityKind =
  | "merchant" | "contact" | "listing" | "service"
  | "driver" | "rider" | "property" | "hotel" | "restaurant";

export interface SmartEntity {
  id: string;
  kind: EntityKind;
  name: string;
  userId?: string | null;
  orbitId?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  vertical?: string;
  avatarUrl?: string | null;
  shopSlug?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export type SmartAction =
  | "message" | "voice_call" | "video_call" | "phone_call" | "whatsapp"
  | "order" | "book" | "taxi_to" | "deliver_from"
  | "view_shop" | "pay" | "share" | "save_contact"
  | "navigate" | "schedule_call";

export interface SmartActionDef {
  action: SmartAction;
  label: string;
  icon: string;
  available: boolean;
  route?: string;
  handler?: () => Promise<void>;
}

export function resolveSmartActions(
  entity: SmartEntity,
  navigate: (path: string) => void,
  startCall?: (opts: any) => Promise<boolean>,
): SmartActionDef[] {
  const actions: SmartActionDef[] = [];
  const canContact = !!(entity.userId || entity.email || entity.orbitId || entity.phone);
  const hasLocation = !!(entity.address || (entity.lat && entity.lng));
  const targetOrbitId = entity.orbitId || (entity.userId ? `orbit_${entity.userId.replace(/-/g, "").substring(0, 8)}` : null);

  if (canContact) {
    actions.push({
      action: "message",
      label: "Message",
      icon: "💬",
      available: true,
      handler: async () => {
        trackOrbitEvent("smart_bridge.action", { screen: "smart_actions", component: "SmartBridge", action: "message", payload: { entityId: entity.id, kind: entity.kind }, result: "triggered" });
        const path = await navigateToOrbitThread({
          targetUserId: entity.userId || undefined,
          targetEmail: entity.email || undefined,
          targetName: entity.name,
        });
        if (path) navigate(path);
      },
    });
  }

  if (canContact && startCall && targetOrbitId) {
    actions.push({
      action: "voice_call",
      label: "Call",
      icon: "📞",
      available: true,
      handler: async () => {
        trackOrbitEvent("smart_bridge.action", { screen: "smart_actions", component: "SmartBridge", action: "voice_call", payload: { entityId: entity.id, kind: entity.kind }, result: "triggered" });
        await startCall({
          targetId: targetOrbitId,
          receiverUserId: entity.userId || undefined,
          entityType: "direct",
          peerName: entity.name,
          isVideo: false,
        });
      },
    });

    actions.push({
      action: "video_call",
      label: "Video",
      icon: "📹",
      available: true,
      handler: async () => {
        trackOrbitEvent("smart_bridge.action", { screen: "smart_actions", component: "SmartBridge", action: "video_call", payload: { entityId: entity.id, kind: entity.kind }, result: "triggered" });
        await startCall({
          targetId: targetOrbitId,
          receiverUserId: entity.userId || undefined,
          entityType: "direct",
          peerName: entity.name,
          isVideo: true,
        });
      },
    });
  }

  if (entity.phone) {
    actions.push({
      action: "phone_call",
      label: "Phone",
      icon: "📱",
      available: true,
      handler: async () => {
        if (navigator.clipboard) navigator.clipboard.writeText(entity.phone!);
        window.open(`tel:${entity.phone}`, "_self");
      },
    });
  }

  if (entity.whatsapp) {
    actions.push({
      action: "whatsapp",
      label: "WhatsApp",
      icon: "💬",
      available: true,
      handler: async () => {
        window.open(`https://wa.me/${entity.whatsapp}`, "_blank");
      },
    });
  }

  if (entity.shopSlug || entity.kind === "merchant" || entity.kind === "restaurant") {
    const shopPath = entity.shopSlug ? `/s/${entity.shopSlug}` : `/s/${entity.id}`;
    actions.push({
      action: "view_shop",
      label: "Shop",
      icon: "🏪",
      available: true,
      route: shopPath,
      handler: async () => navigate(shopPath),
    });

    actions.push({
      action: "order",
      label: "Order",
      icon: "🛒",
      available: true,
      route: shopPath,
      handler: async () => navigate(shopPath),
    });
  }

  if (entity.kind === "restaurant" || entity.vertical === "food") {
    actions.push({
      action: "deliver_from",
      label: "Deliver",
      icon: "🚚",
      available: true,
      handler: async () => {
        const shopPath = entity.shopSlug ? `/s/${entity.shopSlug}` : `/s/${entity.id}`;
        navigate(shopPath);
      },
    });
  }

  if (hasLocation) {
    actions.push({
      action: "taxi_to",
      label: "Taxi",
      icon: "🚕",
      available: true,
      route: "/mobility/taxi",
      handler: async () => {
        platformBus.emit("mobility:set_destination", {
          name: entity.name,
          address: entity.address,
          lat: entity.lat,
          lng: entity.lng,
        }, "smart_bridge");
        navigate("/mobility/taxi");
      },
    });

    actions.push({
      action: "navigate",
      label: "Go",
      icon: "📍",
      available: true,
      handler: async () => {
        const q = entity.address || `${entity.lat},${entity.lng}`;
        window.open(`https://maps.google.com/maps?q=${encodeURIComponent(q)}`, "_blank");
      },
    });
  }

  if (entity.kind === "service" || entity.vertical === "services") {
    actions.push({
      action: "book",
      label: "Book",
      icon: "📅",
      available: true,
      handler: async () => {
        const path = entity.shopSlug ? `/s/${entity.shopSlug}` : `/s/${entity.id}`;
        navigate(path);
      },
    });
  }

  if (entity.kind === "hotel" || entity.vertical === "stay") {
    actions.push({
      action: "book",
      label: "Book",
      icon: "🏨",
      available: true,
      handler: async () => navigate("/stay"),
    });
  }

  if (entity.kind === "property" || entity.vertical === "property") {
    actions.push({
      action: "book",
      label: "Visit",
      icon: "🏠",
      available: true,
      handler: async () => navigate("/property"),
    });
  }

  if (canContact) {
    actions.push({
      action: "pay",
      label: "Pay",
      icon: "💳",
      available: true,
      handler: async () => navigate(`/wallet/transfer?to=${entity.userId || entity.orbitId || ""}&name=${encodeURIComponent(entity.name)}`),
    });
  }

  actions.push({
    action: "share",
    label: "Share",
    icon: "🔗",
    available: true,
    handler: async () => {
      const url = entity.shopSlug
        ? `${window.location.origin}/s/${entity.shopSlug}`
        : `${window.location.origin}/listing/${entity.id}`;
      if (navigator.share) {
        navigator.share({ title: entity.name, url }).catch(() => {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
      }
    },
  });

  if (canContact) {
    actions.push({
      action: "save_contact",
      label: "Save",
      icon: "👤",
      available: true,
      handler: async () => {
        const { upsertOrbitContact } = await import("@/lib/orbit/orbit-contacts-service");
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user?.id) return;
        await upsertOrbitContact({
          ownerUserId: auth.user.id,
          peerUserId: entity.userId,
          peerOrbitId: entity.orbitId,
          displayName: entity.name,
          email: entity.email,
          phone: entity.phone,
          avatarUrl: entity.avatarUrl,
          source: "smart_bridge",
        });
        platformBus.emit("orbit:contacts_updated", { entityId: entity.id }, "smart_bridge");
      },
    });
  }

  return actions.filter(a => a.available);
}

export function buildEntityFromMerchant(merchant: Record<string, any>): SmartEntity {
  return {
    id: merchant.id || merchant.merchant_id || "",
    kind: merchant.vertical === "food" ? "restaurant" : "merchant",
    name: merchant.display_name || merchant.name || "Business",
    userId: merchant.user_id || merchant.owner_id || null,
    orbitId: null,
    email: merchant.contact_email || merchant.email || null,
    phone: merchant.contact_phone || merchant.phone || null,
    whatsapp: merchant.contact_whatsapp || null,
    vertical: merchant.vertical || merchant.category_key || "shops",
    avatarUrl: merchant.logo_url || merchant.avatar_url || null,
    shopSlug: merchant.slug || null,
    address: merchant.address || null,
    lat: merchant.latitude ?? merchant.lat ?? null,
    lng: merchant.longitude ?? merchant.lng ?? null,
  };
}

export function buildEntityFromContact(contact: Record<string, any>): SmartEntity {
  return {
    id: contact.id || "",
    kind: "contact",
    name: contact.display_name || contact.name || "Contact",
    userId: contact.peer_user_id || contact.contact_user_id || null,
    orbitId: contact.peer_orbit_id || null,
    email: contact.email || null,
    phone: contact.phone || null,
    whatsapp: null,
    vertical: undefined,
    avatarUrl: contact.avatar_url || null,
    shopSlug: null,
    address: null,
    lat: null,
    lng: null,
  };
}

export function buildEntityFromListing(listing: Record<string, any>): SmartEntity {
  return {
    id: listing.id || "",
    kind: listing.entity_type === "service" ? "service" : listing.entity_type === "property" ? "property" : "listing",
    name: listing.title || listing.name || "Listing",
    userId: listing.org_id || listing.user_id || null,
    orbitId: null,
    email: listing.contact_email || null,
    phone: listing.contact_phone || null,
    whatsapp: listing.contact_whatsapp || null,
    vertical: listing.vertical || listing.category_key || undefined,
    avatarUrl: listing.cover_url || listing.image_url || null,
    shopSlug: listing.slug || null,
    address: listing.address || listing.area || null,
    lat: listing.latitude ?? listing.lat ?? null,
    lng: listing.longitude ?? listing.lng ?? null,
  };
}
