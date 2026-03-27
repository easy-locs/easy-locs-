import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createAppNotification } from "@/lib/notifications/app-notification-service";

const db = supabase as any;

interface Props {
  bookingId: string;
  guestName: string;
  guestEmail: string;
}

/**
 * Public-facing reply component for guests to communicate
 * about their booking without needing authentication.
 *
 * FIXED: Migrated from legacy "messages" + "notifications" tables
 * to canonical "chat_messages_v2" + "app_notifications".
 */
export default function GuestBookingReply({ bookingId, guestName, guestEmail }: Props) {
  const qc = useQueryClient();
  const [newMessage, setNewMessage] = useState("");

  // Load messages for this booking from V2 table
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["guest_booking_messages", bookingId],
    queryFn: async () => {
      // Find conversation linked to this booking
      const { data: conv } = await db
        .from("conversations_v2")
        .select("id")
        .eq("booking_id", bookingId)
        .limit(1)
        .maybeSingle();

      if (!conv?.id) return [];

      const { data } = await db
        .from("chat_messages_v2")
        .select("id, body, created_at, type, sender_user_id, metadata")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true })
        .limit(200);

      return (data || [])
        .filter((m: any) => m.type !== "system" || !(m.metadata as any)?.internal)
        .map((m: any) => ({
          ...m,
          content: m.body,
          isFromHost: !!m.sender_user_id,
        }));
    },
    enabled: !!bookingId,
    refetchInterval: 15000,
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      // Find or get conversation for this booking
      const { data: conv } = await db
        .from("conversations_v2")
        .select("id")
        .eq("booking_id", bookingId)
        .limit(1)
        .maybeSingle();

      const conversationId = conv?.id;
      if (!conversationId) throw new Error("Conversation not found for this booking");

      // Insert guest message into V2 table
      await db.from("chat_messages_v2").insert({
        conversation_id: conversationId,
        sender_user_id: null, // Guest has no auth user
        sender_orbit_id: `guest_${guestEmail.replace(/[^a-z0-9]/gi, "_").slice(0, 20)}`,
        type: "text",
        body: newMessage,
        metadata: {
          guest_name: guestName,
          guest_email: guestEmail,
          booking_id: bookingId,
          source: "guest_reply",
        },
      });

      // Update conversation preview
      await db
        .from("conversations_v2")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: `${guestName}: ${newMessage.slice(0, 100)}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      // Notify host via app_notifications
      const { data: booking } = await supabase
        .from("booking_requests")
        .select("org_id")
        .eq("id", bookingId)
        .maybeSingle();

      if (booking?.org_id) {
        const { data: org } = await supabase
          .from("orgs")
          .select("owner_user_id")
          .eq("id", booking.org_id)
          .maybeSingle();

        if (org?.owner_user_id) {
          await createAppNotification({
            userId: org.owner_user_id,
            scope: "booking",
            title: "💬 Guest reply",
            body: `${guestName} replied to booking conversation`,
            route: `/dashboard/seasonal?booking=${bookingId}`,
            severity: "info",
            entityType: "booking_request",
            entityId: bookingId,
          });
        }
      }
    },
    onSuccess: () => {
      setNewMessage("");
      qc.invalidateQueries({ queryKey: ["guest_booking_messages", bookingId] });
      toast.success("Message sent!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Messages</h3>

      <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-xl p-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">No messages yet</p>
        ) : (
          messages.map((m: any) => (
            <div
              key={m.id}
              className={`p-2.5 rounded-lg text-sm ${
                m.isFromHost
                  ? "bg-card border border-border"
                  : "bg-accent/10 border border-accent/20 ml-4"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xs font-medium text-muted-foreground">
                  {m.isFromHost ? "Host" : "You"}
                </span>
                <span className="text-2xs text-muted-foreground ml-auto">
                  {format(new Date(m.created_at), "dd/MM HH:mm")}
                </span>
              </div>
              <p className="text-foreground whitespace-pre-line">{m.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder={`Reply as ${guestName}...`}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="min-h-[3rem] rounded-xl"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!newMessage.trim() || sendReply.isPending}
            onClick={() => sendReply.mutate()}
            className="rounded-xl"
          >
            {sendReply.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Send className="h-3 w-3 mr-1" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
