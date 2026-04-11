/**
 * useHudBookingActions — Extracted from HudChatPanel.
 * Single responsibility: booking status transitions within a chat thread.
 */
import { useCallback, useRef } from "react";
import * as bookingRepo from "@/repositories/booking-actions.repository";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { ConversationThread } from "@/components/communication-hub/types";

export function useHudBookingActions(
  thread: ConversationThread | null,
  orgId: string | null,
  userId: string | undefined,
  myOrbitId: string | null,
  onThreadUpdate: (conversationId: string, updates: Partial<ConversationThread>) => void,
) {
  const { t } = useI18n();
  const threadRef = useRef(thread);
  threadRef.current = thread;
  const onThreadUpdateRef = useRef(onThreadUpdate);
  onThreadUpdateRef.current = onThreadUpdate;

  const handleBookingAction = useCallback(async (action: "confirm" | "cancel" | "complete") => {
    const currentThread = threadRef.current;
    if (!orgId || !userId || !currentThread?.bookingId) return;
    const statusMap = { confirm: "confirmed", cancel: "cancelled", complete: "completed" };
    const newStatus = statusMap[action];
    try {
      if (currentThread.bookingType === "marketplace")
        await bookingRepo.updateMarketplaceBooking(currentThread.bookingId, newStatus);
      else if (currentThread.bookingType === "concierge")
        await bookingRepo.updateConciergeOrder(currentThread.bookingId, newStatus, action);
      else if (currentThread.bookingType === "seasonal")
        await bookingRepo.updateBookingRequest(currentThread.bookingId, newStatus);

      const conversationId = currentThread.conversationId || currentThread.v2ConversationId;
      if (conversationId) {
        const actionLabels = { confirm: "✅ Booking confirmed", cancel: "❌ Booking cancelled", complete: "🏁 Booking completed" };
        await bookingRepo.insertChatMessage(
          conversationId,
          userId,
          myOrbitId || `orbit_${userId.replace(/-/g, "").substring(0, 8)}`,
          actionLabels[action],
          { booking_action: action, booking_id: currentThread.bookingId },
        );
        await bookingRepo.updateConversationTimestamp(conversationId);
      }

      onThreadUpdateRef.current(currentThread.id, { bookingStatus: newStatus });
      toast.success(t(`orbit.booking_${action}`) || action);
    } catch (e: any) {
      console.error("[Orbit]", e?.message);
      toast.error("Something went wrong. Please try again.");
    }
  }, [orgId, userId, t, myOrbitId]);

  return { handleBookingAction };
}
