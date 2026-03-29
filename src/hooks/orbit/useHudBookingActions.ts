/**
 * useHudBookingActions — Extracted from HudChatPanel.
 * Single responsibility: booking status transitions within a chat thread.
 */
import { useCallback } from "react";
import * as bookingRepo from "@/repositories/booking-actions.repository";
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
        await bookingRepo.updateMarketplaceBooking(thread.bookingId, newStatus);
      else if (thread.bookingType === "concierge")
        await bookingRepo.updateConciergeOrder(thread.bookingId, newStatus, action);
      else if (thread.bookingType === "seasonal")
        await bookingRepo.updateBookingRequest(thread.bookingId, newStatus);

      if (thread.v2ConversationId) {
        const actionLabels = { confirm: "✅ Booking confirmed", cancel: "❌ Booking cancelled", complete: "🏁 Booking completed" };
        await bookingRepo.insertChatMessage(
          thread.v2ConversationId,
          userId,
          myOrbitId || `orbit_${userId.slice(0, 12)}`,
          actionLabels[action],
          { booking_action: action, booking_id: thread.bookingId },
        );
        await bookingRepo.updateConversationTimestamp(thread.v2ConversationId);
      }

      onThreadUpdate(thread.id, { bookingStatus: newStatus });
      toast.success(t(`orbit.booking_${action}`) || action);
    } catch (e: any) {
      toast.error(e?.message || "Booking action failed");
    }
  }, [orgId, userId, thread, onThreadUpdate, t, myOrbitId]);

  return { handleBookingAction };
}
