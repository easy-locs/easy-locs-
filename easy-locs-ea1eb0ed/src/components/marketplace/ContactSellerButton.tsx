import { useState } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createConversation } from "@/repositories/communication.repository";
import { insertNotification } from "@/lib/notification-service/notification-service";
import { platformBus } from "@/lib/shared/platform-bus";

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
      toast({ title: "Connexion requise", description: "Connectez-vous pour contacter le vendeur", variant: "destructive" });
      navigate("/login");
      return;
    }

    if (user.id === sellerUserId) {
      toast({ title: "C'est votre annonce", description: "Vous ne pouvez pas vous contacter vous-même" });
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
        title: "Nouveau message pour votre annonce",
        body: `${user.user_metadata?.full_name || user.email?.split("@")[0] || "Un acheteur"} vous a contacté pour "${listingTitle}"`,
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
      toast({ title: "Erreur", description: "Impossible de contacter le vendeur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <button
        onClick={handleContact}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20 transition-colors font-medium disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
        Contacter
      </button>
    );
  }

  return (
    <button
      onClick={handleContact}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground px-4 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}
      Contacter le vendeur via Orbit
    </button>
  );
}
