/**
 * System message generator — creates automatic communication events
 * for payments, documents, leases, maintenance, etc.
 */
import { supabase } from "@/integrations/supabase/client";

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

const EVENT_MESSAGES: Record<SystemEventType, { content: string; category: string }> = {
  payment_received: { content: "💰 Paiement reçu — {month} ({amount})", category: "payment" },
  payment_overdue: { content: "⚠️ Loyer impayé — {month} ({amount}). Merci de régulariser.", category: "payment" },
  rent_reminder: { content: "🔔 Rappel : votre loyer de {month} est dû le {due_date}. Montant : {amount}.", category: "payment" },
  lease_signed: { content: "📝 Bail signé par toutes les parties pour {property}.", category: "lease" },
  lease_created: { content: "📝 Nouveau bail créé pour {property}. Début : {start_date}.", category: "lease" },
  document_uploaded: { content: "📄 Nouveau document disponible : {title}.", category: "general" },
  document_signed: { content: "✅ Document signé : {title}.", category: "legal" },
  maintenance_created: { content: "🔧 Demande de maintenance créée : {title}. Priorité : {priority}.", category: "maintenance" },
  maintenance_resolved: { content: "✅ Maintenance résolue : {title}.", category: "maintenance" },
  booking_confirmed: { content: "🏖️ Réservation confirmée du {check_in} au {check_out}.", category: "general" },
  booking_cancelled: { content: "❌ Réservation annulée du {check_in} au {check_out}.", category: "general" },
  checkin_reminder: { content: "🏠 Rappel : check-in prévu le {check_in}.", category: "general" },
  checkout_reminder: { content: "🏠 Rappel : check-out prévu le {check_out}.", category: "general" },
  account_welcome: { content: "👋 Bienvenue ! Votre espace locataire est prêt. Accédez à vos documents, payez votre loyer et communiquez avec votre bailleur.", category: "general" },
};

function interpolate(text: string, data: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? key);
}

/**
 * Creates a system message in a tenant's conversation.
 * These appear as automated notifications within the chat thread.
 */
export async function createSystemMessage(payload: SystemMessagePayload): Promise<void> {
  const template = EVENT_MESSAGES[payload.event];
  if (!template) return;

  const content = interpolate(template.content, payload.data || {});

  await supabase.from("messages").insert({
    tenant_id: payload.tenantId,
    org_id: payload.orgId,
    sender_id: "00000000-0000-0000-0000-000000000000", // system sender
    content,
    category: payload.category || template.category,
    message_type: "system",
    property_id: payload.propertyId || null,
    lease_id: payload.leaseId || null,
    read: false,
  } as any);
}

/**
 * Sends both a system message AND a notification + optional email
 */
export async function createSystemEvent(payload: SystemMessagePayload & {
  notifyUserId?: string;
  notificationTitle?: string;
  notificationLink?: string;
  emailRecipient?: string;
  emailLocale?: string;
}): Promise<void> {
  await createSystemMessage(payload);

  // In-app notification
  if (payload.notifyUserId) {
    const template = EVENT_MESSAGES[payload.event];
    const content = interpolate(template.content, payload.data || {});
    await supabase.from("notifications").insert({
      user_id: payload.notifyUserId,
      org_id: payload.orgId,
      type: template.category === "payment" ? "payment" : "info",
      title: payload.notificationTitle || content.slice(0, 50),
      message: content,
      link: payload.notificationLink || "/tenant/messages",
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
