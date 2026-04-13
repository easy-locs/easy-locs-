/**
 * RealtimeMessageToast — Global listener for incoming V2 messages.
 * Shows a toast when a new message arrives, regardless of current page.
 * V3: Migrated to chat_messages_v2.
 */
import { db } from "@/services/db";
import { useEffect, useRef } from "react";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { registerSubscription } from "@/lib/realtime/subscription-registry";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { isOutgoingMessage } from "@/domains/orbit/resolvers";

export default function RealtimeMessageToast() {
  const { user } = useAuth();
  const lastNotified = useRef<string>("");

  useEffect(() => {
    if (!user) return;

    const unsub = registerSubscription(`orbit.toast:${user.id}`, () => {
      const channel = db
        .channel("msg-toast-listener")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "chat_messages_v2" },
          (payload) => {
            const msg = payload.new as any;
            if (isOutgoingMessage(msg, user.id)) return;
            if (msg.id === lastNotified.current) return;
            lastNotified.current = msg.id;

            const senderName = msg.metadata?.sender_name || "Someone";
            const preview = (msg.body || "").slice(0, 80);

            toast(senderName, {
              description: preview || "New message",
              icon: <MessageSquare className="h-4 w-4" />,
              duration: 5000,
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = `/orbit?conversation=${msg.conversation_id}`;
                },
              },
            });
          }
        )
        .subscribe();
      return () => removeRealtimeChannel(channel);
    });

    return () => { unsub(); };
  }, [user]);

  return null;
}
