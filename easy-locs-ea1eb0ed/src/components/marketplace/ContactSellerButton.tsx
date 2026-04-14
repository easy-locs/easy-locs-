import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createConversation } from "@/repositories/communication.repository";
import { insertNotification } from "@/lib/notification-service/notification-service";
import { platformBus } from "@/lib/shared/platform-bus";
import { tc } from "@/lib/i18n-canonical";

interface Props {
  listingId: string;
  listingTitle: string;
  sellerUserId: string;
  sellerName: string;
  variant?: "default" | "compact";
}

export default function ContactSellerButton({
  listingId,
  listingTitle,
  sellerUserId,
  sellerName,
  variant = "default",
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleContact = async () => {
    if (!user) {
      toast({ title: tc("c2c.login_required"), description: tc("c2c.login_required_desc"), variant: "destructive" });
      navigate("/login");
      return;
    }

    if (user.id === sellerUserId) {
      toast({ title: tc("c2c.own_listing"), description: tc("c2c.own_listing_desc") });
      return;
    }

    setLoading(true);
    try {
      const conversationTitle = `[C2C] ${listingTitle}`;

      const conversation = await createConversation({
        type: "c2c_exchange",
        title: conversationTitle,
        participants: [
          { user_id: user.id, role: "buyer" },
          { user_id: sellerUserId, role: "seller" },
        ],
      });

      void insertNotification({
        user_id: sellerUserId,
        actor: "client",
        domain: "system",
        type: "c2c.new_message",
        title: tc("c2c.new_message_notification"),
        body: tc("c2c.buyer_contacted", {
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || tc("c2c.a_buyer"),
          listing: listingTitle,
        }),
        priority: "normal",
        data: { listingId, conversationId: conversation.id },
        action_url: `/orbit/chat/${conversation.id}`,
        dedupe_key: `c2c_contact_${listingId}_${user.id}`,
      });

      platformBus.emit("orbit:message_sent", {
        type: "orbit:message_sent",
        payload: { conversationId: conversation.id, listingId },
      });

      navigate(`/orbit/chat/${conversation.id}`);
    } catch (err: any) {
      console.error("[ContactSellerButton]", err?.message);
      toast({ title: tc("common.error"), description: tc("c2c.contact_error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleContact}
        disabled={loading}
        aria-label={tc("c2c.contact_compact")}
        className="flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-2xl hover:bg-accent/20 active:scale-[0.98] transition-all duration-200 font-medium disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
        {tc("c2c.contact_compact")}
      </button>
    );
  }

  return (
    <button
      onClick={handleContact}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-3 rounded-2xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 shadow-sm"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      {tc("c2c.contact_seller")}
    </button>
  );
}
