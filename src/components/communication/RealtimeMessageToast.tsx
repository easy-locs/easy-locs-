/**
 * RealtimeMessageToast — Global listener for incoming V2 messages.
 * Shows a toast when a new message arrives, regardless of current page.
 * V3: Migrated to chat_messages_v2.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

export default function RealtimeMessageToast() {
  const { user } = useAuth();
  const lastNotified = useRef<string>("");

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("msg-toast-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages_v2" },
        (payload) => {
          const msg = payload.new as any;
          // Don't notify for own messages
          if (msg.sender_user_id === user.id) return;
          // Deduplicate
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

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return null;
}
