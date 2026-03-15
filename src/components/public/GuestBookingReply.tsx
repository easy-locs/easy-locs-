import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
  bookingId: string;
  guestName: string;
  guestEmail: string;
}

/**
 * Public-facing reply component for guests to communicate
 * about their booking without needing authentication.
 */
export default function GuestBookingReply({ bookingId, guestName, guestEmail }: Props) {
  const qc = useQueryClient();
  const [newMessage, setNewMessage] = useState("");

  // Load messages for this booking
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["guest_booking_messages", bookingId],
    queryFn: async () => {
      // Fetch booking to get org_id
      const { data: booking } = await supabase
        .from("booking_requests")
        .select("org_id, guest_name, guest_email")
        .eq("id", bookingId)
        .maybeSingle();

      if (!booking) return [];

      const { data } = await supabase
        .from("messages")
        .select("id, content, created_at, message_type, sender_id, attachment_url")
        .eq("org_id", booking.org_id)
        .order("created_at", { ascending: true })
        .limit(200);

      // Filter messages related to this booking
      return (data || []).filter((m: any) => {
        const content = m.content || "";
        return content.includes(bookingId);
      }).map((m: any) => ({
        ...m,
        isInternal: m.content?.includes("[Internal]"),
        isFromHost: !!m.sender_id,
      })).filter((m: any) => !m.isInternal); // Hide internal notes from guest
    },
    enabled: !!bookingId,
    refetchInterval: 15000, // Poll every 15s for new messages
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      // Get booking org_id
      const { data: booking } = await supabase
        .from("booking_requests")
        .select("org_id")
        .eq("id", bookingId)
        .maybeSingle();

      if (!booking) throw new Error("Booking not found");

      // Insert guest message
      await supabase.from("messages").insert({
        org_id: booking.org_id,
        sender_id: null, // Guest has no auth user
        content: `💬 [Guest: ${guestName}] ${newMessage}\n\n[Booking: ${bookingId}]`,
        category: "booking",
        message_type: "incoming",
        read: false,
      } as any);

      // Notify host via notification
      const { data: org } = await supabase
        .from("orgs")
        .select("owner_user_id")
        .eq("id", booking.org_id)
        .maybeSingle();

      if (org?.owner_user_id) {
        await supabase.from("notifications").insert({
          user_id: org.owner_user_id,
          org_id: booking.org_id,
          type: "info",
          title: "💬 Guest reply",
          message: `${guestName} replied to booking conversation`,
          link: `/dashboard/seasonal?booking=${bookingId}`,
          metadata_json: {
            target_type: "booking_request",
            target_id: bookingId,
            booking_id: bookingId,
          },
        });
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

      {/* Messages list */}
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
              <p className="text-foreground whitespace-pre-line">
                {m.content
                  ?.replace(/\[Booking: [^\]]+\]/g, "")
                  .replace(/📌 \[Internal\] |📧 \[Email\] |💬 \[Guest: [^\]]*\] /g, "")
                  .trim()}
              </p>
              {m.attachment_url && (
                <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs underline text-accent">
                  <Paperclip className="h-3 w-3" /> Attachment
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reply input */}
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
