/**
 * RealtimeMessageToast — Global listener for incoming messages.
 * Shows a toast when a new message arrives, regardless of current page.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

export default function RealtimeMessageToast() {
  const { user, activeRole, orgId } = useAuth();
  const lastNotified = useRef<string>("");

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("msg-toast-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          // Don't notify for own messages
          if (msg.sender_id === user.id) return;
          // Don't notify system messages
          if (msg.sender_id === "00000000-0000-0000-0000-000000000000") return;
          // Deduplicate
          if (msg.id === lastNotified.current) return;
          lastNotified.current = msg.id;

          // Check relevance based on role
          let isRelevant = false;
          if (activeRole === "landlord" && orgId && msg.org_id === orgId) {
            isRelevant = true;
          } else if (activeRole === "tenant" && msg.tenant_id) {
            // Will show for any tenant message - basic check
            isRelevant = true;
          } else if (activeRole === "client" && user.email && msg.contact_email?.toLowerCase() === user.email.toLowerCase()) {
            isRelevant = true;
          }

          if (!isRelevant) return;

          const senderName = msg.contact_name || msg.contact_email || "Someone";
          const preview = (msg.content || "").slice(0, 80);

          toast(senderName, {
            description: preview || "New message",
            icon: <MessageSquare className="h-4 w-4" />,
            duration: 5000,
            action: {
              label: "View",
              onClick: () => {
                const base = activeRole === "landlord" ? "/dashboard/communication" : activeRole === "tenant" ? "/tenant/messages" : "/client/messages";
                window.location.href = base;
              },
            },
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, activeRole, orgId]);

  return null;
}
