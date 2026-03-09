/**
 * System message generator — creates automatic communication events
 * for payments, documents, leases, maintenance, etc.
 * 
 * Each notification now carries structured metadata for precise deep-linking:
 *   target_type, target_id, booking_id, country_code, target_url
 */
import { supabase } from "@/integrations/supabase/client";
import { createDeepLinkMeta, createNotification } from "@/lib/shared";
import type { TargetType, AppModule } from "@/lib/shared/types";

type SystemEventType =
  | "payment_received"
  | "payment_overdue"
  | "rent_reminder"
  | "lease_signed"
  | "lease_created"
  | "document_uploaded"
  | "document_signed"
  | "maintenance_created"
  | "maintenance_resolved"
  | "booking_confirmed"
  | "booking_cancelled"
  | "checkin_reminder"
  | "checkout_reminder"
  | "account_welcome";

interface SystemMessagePayload {
  event: SystemEventType;
  tenantId: string;
  orgId: string;
  propertyId?: string;
  leaseId?: string;
  data?: Record<string, string>;
  category?: string;
}

interface DeepLinkContext {
  target_type?: string;
  target_id?: string;
  booking_id?: string;
  country_code?: string;
  target_url?: string;
}

const EVENT_MESSAGES: Record<SystemEventType, { content: string; category: string; target_type: string }> = {
  payment_received: { content: "💰 Paiement reçu — {month} ({amount})", category: "payment", target_type: "payment" },
  payment_overdue: { content: "⚠️ Loyer impayé — {month} ({amount}). Merci de régulariser.", category: "payment", target_type: "payment" },
  rent_reminder: { content: "🔔 Rappel : votre loyer de {month} est dû le {due_date}. Montant : {amount}.", category: "payment", target_type: "payment" },
  lease_signed: { content: "📝 Bail signé par toutes les parties pour {property}.", category: "lease", target_type: "lease" },
  lease_created: { content: "📝 Nouveau bail créé pour {property}. Début : {start_date}.", category: "lease", target_type: "lease" },
  document_uploaded: { content: "📄 Nouveau document disponible : {title}.", category: "general", target_type: "document" },
  document_signed: { content: "✅ Document signé : {title}.", category: "legal", target_type: "document" },
  maintenance_created: { content: "🔧 Demande de maintenance créée : {title}. Priorité : {priority}.", category: "maintenance", target_type: "intervention" },
  maintenance_resolved: { content: "✅ Maintenance résolue : {title}.", category: "maintenance", target_type: "intervention" },
  booking_confirmed: { content: "🏖️ Réservation confirmée du {check_in} au {check_out}.", category: "general", target_type: "booking_request" },
  booking_cancelled: { content: "❌ Réservation annulée du {check_in} au {check_out}.", category: "general", target_type: "booking_request" },
  checkin_reminder: { content: "🏠 Rappel : check-in prévu le {check_in}.", category: "general", target_type: "booking_request" },
  checkout_reminder: { content: "🏠 Rappel : check-out prévu le {check_out}.", category: "general", target_type: "booking_request" },
  account_welcome: { content: "👋 Bienvenue ! Votre espace locataire est prêt. Accédez à vos documents, payez votre loyer et communiquez avec votre bailleur.", category: "general", target_type: "message" },
};

function interpolate(text: string, data: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? key);
}

/**
 * Creates a system message in a tenant's conversation.
 */
export async function createSystemMessage(payload: SystemMessagePayload): Promise<void> {
  const template = EVENT_MESSAGES[payload.event];
  if (!template) return;

  const content = interpolate(template.content, payload.data || {});

  await supabase.from("messages").insert({
    tenant_id: payload.tenantId,
    org_id: payload.orgId,
    sender_id: "00000000-0000-0000-0000-000000000000",
    content,
    category: payload.category || template.category,
    message_type: "system",
    property_id: payload.propertyId || null,
    lease_id: payload.leaseId || null,
    read: false,
  } as any);
}

/**
 * Sends both a system message AND a notification + optional email.
 * Notifications carry deep-link metadata for exact record navigation.
 */
export async function createSystemEvent(payload: SystemMessagePayload & {
  notifyUserId?: string;
  notificationTitle?: string;
  notificationLink?: string;
  emailRecipient?: string;
  emailLocale?: string;
  deepLink?: DeepLinkContext;
}): Promise<void> {
  await createSystemMessage(payload);

  // In-app notification with deep-link metadata
  if (payload.notifyUserId) {
    const template = EVENT_MESSAGES[payload.event];
    const content = interpolate(template.content, payload.data || {});

    // Build metadata_json with deep-link context
    const metadata: Record<string, any> = {
      target_type: payload.deepLink?.target_type || template.target_type,
      org_id: payload.orgId,
    };
    if (payload.deepLink?.target_id) metadata.target_id = payload.deepLink.target_id;
    if (payload.deepLink?.booking_id) metadata.booking_id = payload.deepLink.booking_id;
    if (payload.deepLink?.country_code) metadata.country_code = payload.deepLink.country_code;
    if (payload.deepLink?.target_url) metadata.target_url = payload.deepLink.target_url;
    if (payload.propertyId) metadata.property_id = payload.propertyId;
    if (payload.leaseId) metadata.lease_id = payload.leaseId;

    await supabase.from("notifications").insert({
      user_id: payload.notifyUserId,
      org_id: payload.orgId,
      type: template.category === "payment" ? "payment" : "info",
      title: payload.notificationTitle || content.slice(0, 50),
      message: content,
      link: payload.notificationLink || "/tenant/messages",
      metadata_json: metadata,
    });
  }

  // Email notification via edge function
  if (payload.emailRecipient) {
    try {
      const eventMap: Record<string, string> = {
        payment_received: "payment_received",
        payment_overdue: "dunning",
        rent_reminder: "rent_due",
        lease_signed: "lease_signed",
        maintenance_created: "intervention",
        booking_confirmed: "booking_request",
      };
      const emailEvent = eventMap[payload.event];
      if (emailEvent) {
        await supabase.functions.invoke("send-notification-email", {
          body: {
            event_type: emailEvent,
            recipient_email: payload.emailRecipient,
            data: payload.data || {},
            locale: payload.emailLocale || "fr",
          },
        });
      }
    } catch (e) {
      console.error("[system-messages] Email failed:", e);
    }
  }
}
