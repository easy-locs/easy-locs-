import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Paperclip, StickyNote, Mail, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { insertAuditLog } from "@/repositories/marketplace.repository";
import { insertMessage } from "@/repositories/communication.repository";

interface Props { bookingId: string; orgId: string; customerName: string; customerEmail?: string; }
type MessageType = "message" | "internal_note" | "email" | "notification";

export default function BookingCommunicationThread({ bookingId, orgId, customerName, customerEmail }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("message");

  const { data: messages = [] } = useQuery({
    queryKey: ["booking_messages", bookingId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("chat_messages_v2").select("*").order("created_at", { ascending: true }).limit(200);
      return (data || []).filter((m: any) => {
        const content = m.content || "";
        return content.includes(bookingId) || (m.category === "booking" && content.includes(customerName));
      });
    },
    enabled: !!bookingId && !!orgId,
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const prefix = messageType === "internal_note" ? "📌 [Internal] " : messageType === "email" ? "📧 [Email] " : "";
      const content = `${prefix}${newMessage}\n\n[Booking: ${bookingId}]`;

      if (messageType === "internal_note") {
        await insertMessage({
          conversationId: bookingId,
          senderUserId: user?.id || "00000000-0000-0000-0000-000000000000",
          type: "system",
          body: content,
          metadata: { category: "booking", internal: true },
        });
      } else {
        const { sendCommunicationEvent, createDeepLinkMeta } = await import("@/lib/shared");
        const meta = createDeepLinkMeta({ targetType: "marketplace_booking", targetId: bookingId, module: "marketplace", bookingId, orgId });
        await sendCommunicationEvent({ orgId, senderId: user?.id, recipientEmail: messageType === "email" ? customerEmail : undefined, subject: `Message from your provider`, message: newMessage, category: "booking", meta });
      }

      await insertAuditLog({
        org_id: orgId, user_id: user?.id,
        action: `${messageType === "internal_note" ? "Internal note" : "Message"} sent for booking`,
        metadata_json: { booking_id: bookingId, type: messageType } as any,
      });
    },
    onSuccess: () => { setNewMessage(""); qc.invalidateQueries({ queryKey: ["booking_messages", bookingId] }); toast.success(messageType === "internal_note" ? "Note added" : "Message sent"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const typeButtons: { type: MessageType; icon: any; label: string }[] = [
    { type: "message", icon: MessageCircle, label: "Message" },
    { type: "internal_note", icon: StickyNote, label: "Note" },
    { type: "email", icon: Mail, label: "Email" },
  ];

  return (
    <div className="space-y-4">
      <div className="max-h-64 overflow-y-auto space-y-2 border border-border rounded-lg p-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">No messages yet</p>
        ) : (
          messages.map((m: any) => {
            const isInternal = m.content?.includes("[Internal]");
            const isEmail = m.content?.includes("[Email]");
            const isSystem = m.message_type === "system";
            return (
              <div key={m.id} className={`p-2.5 rounded-lg text-sm ${isInternal ? "bg-amber-500/10 border border-amber-500/20" : isSystem ? "bg-muted/30" : "bg-card border border-border"}`}>
                <div className="flex items-center gap-2 mb-1">
                  {isInternal && <Badge variant="outline" className="text-[10px]">📌 Internal</Badge>}
                  {isEmail && <Badge variant="outline" className="text-[10px]">📧 Email</Badge>}
                  {isSystem && <Badge variant="outline" className="text-[10px]">🤖 System</Badge>}
                  <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(m.created_at), "dd/MM HH:mm")}</span>
                </div>
                <p className="text-foreground whitespace-pre-line">{m.content?.replace(/\[Booking: [^\]]+\]/g, "").replace(/📌 \[Internal\] |📧 \[Email\] /g, "").trim()}</p>
                {m.attachment_url && (
                  <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs underline text-accent">
                    <Paperclip className="h-3 w-3" /> Pièce jointe
                  </a>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="space-y-2">
        <div className="flex gap-1">
          {typeButtons.map(({ type, icon: Icon, label }) => (
            <Button key={type} size="sm" variant={messageType === type ? "default" : "ghost"} onClick={() => setMessageType(type)} className="text-xs">
              <Icon className="h-3 w-3 mr-1" /> {label}
            </Button>
          ))}
        </div>
        <Textarea placeholder={messageType === "internal_note" ? "Add an internal note..." : `Message to ${customerName}...`} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="min-h-[4rem]" />
        <div className="flex justify-end">
          <Button size="sm" disabled={!newMessage.trim() || sendMessage.isPending} onClick={() => sendMessage.mutate()}>
            <Send className="h-3 w-3 mr-1" />
            {messageType === "email" ? "Send Email" : messageType === "internal_note" ? "Save Note" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
