/**
 * useHudBookingActions — Extracted from HudChatPanel.
 * Single responsibility: booking status transitions within a chat thread.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { ConversationThread } from "@/components/communication-hub/types";

export function useHudBookingActions(
  thread: ConversationThread | null,
  orgId: string | null,
  userId: string | undefined,
  myOrbitId: string | null,
  onThreadUpdate: (threadId: string, updates: Partial<ConversationThread>) => void,
) {
  const { t } = useI18n();

  const handleBookingAction = useCallback(async (action: "confirm" | "cancel" | "complete") => {
    if (!orgId || !userId || !thread?.bookingId) return;
    const statusMap = { confirm: "confirmed", cancel: "cancelled", complete: "completed" };
    const newStatus = statusMap[action];
    try {
      if (thread.bookingType === "marketplace")
        await supabase.from("marketplace_bookings").update({ status: newStatus }).eq("id", thread.bookingId);
      else if (thread.bookingType === "concierge") {
        const updates: any = { status: newStatus };
        if (action === "confirm") updates.confirmed_at = new Date().toISOString();
        if (action === "cancel") updates.cancelled_at = new Date().toISOString();
        if (action === "complete") updates.completed_at = new Date().toISOString();
        await supabase.from("concierge_orders").update(updates).eq("id", thread.bookingId);
      } else if (thread.bookingType === "seasonal")
        await supabase.from("booking_requests").update({ status: newStatus }).eq("id", thread.bookingId);

      if (thread.v2ConversationId) {
        const actionLabels = { confirm: "✅ Booking confirmed", cancel: "❌ Booking cancelled", complete: "🏁 Booking completed" };
        await (supabase as any).from("chat_messages_v2").insert({
          conversation_id: thread.v2ConversationId,
          sender_user_id: userId,
          sender_orbit_id: myOrbitId || `orbit_${userId.slice(0, 12)}`,
          type: "system",
          body: actionLabels[action],
          metadata: { booking_action: action, booking_id: thread.bookingId },
        });
        await (supabase as any).from("conversations_v2").update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", thread.v2ConversationId);
      }

      onThreadUpdate(thread.id, { bookingStatus: newStatus });
      toast.success(t(`orbit.booking_${action}`) || action);
    } catch (e: any) {
      toast.error(e?.message || "Booking action failed");
    }
  }, [orgId, userId, thread, onThreadUpdate, t, myOrbitId]);

  return { handleBookingAction };
}
