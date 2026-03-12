/**
 * ExploreContactDrawer — Allows visitors to contact a provider directly from Explore.
 * Requires authentication. Authenticated users get direct messaging with sender_id.
 */
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2, LogIn, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ExploreContactDrawerProps {
  open: boolean;
  onClose: () => void;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  orgId: string;
  providerPhone?: string;
  providerWhatsApp?: string;
}

export default function ExploreContactDrawer({
  open, onClose, providerName, serviceTitle, serviceId, orgId, providerPhone, providerWhatsApp,
}: ExploreContactDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Not logged in → show login prompt inside drawer
  if (!user) {
    return (
      <Sheet open={open} onOpenChange={v => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] pb-safe">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-left">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Login to contact {providerName}
            </SheetTitle>
            <p className="text-sm text-muted-foreground text-left">{serviceTitle}</p>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Create a free account to send messages and access contact information.
            </p>
            <Button onClick={() => { onClose(); navigate("/login"); }} className="w-full gap-2 min-h-[44px]">
              <LogIn className="h-4 w-4" />
              Login / Sign up
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Authenticated users → direct message with sender_id
  return (
    <AuthenticatedContact
      open={open}
      onClose={onClose}
      providerName={providerName}
      serviceTitle={serviceTitle}
      serviceId={serviceId}
      orgId={orgId}
    />
  );
}

function AuthenticatedContact({
  open, onClose, providerName, serviceTitle, serviceId, orgId,
}: Omit<ExploreContactDrawerProps, "providerPhone" | "providerWhatsApp">) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) { toast.error("Please write a message"); return; }
    if (!user) { toast.error("Please login first"); return; }
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: user.id,
        content: message.trim(),
        category: "general",
        contact_name: user.user_metadata?.name || user.email,
        contact_email: user.email,
        context_id: serviceId,
        message_type: "inquiry",
        read: false,
      });
      if (error) throw error;
      toast.success("Message sent!");
      setMessage("");
      onClose();
    } catch {
      toast.error("Failed to send message");
    }
    setSending(false);
  };

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] pb-safe">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <MessageSquare className="h-5 w-5 text-accent" />
            Contact {providerName}
          </SheetTitle>
          <p className="text-sm text-muted-foreground text-left">{serviceTitle}</p>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <Textarea
            placeholder="Write your message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button onClick={handleSend} disabled={sending} className="w-full gap-2 min-h-[44px]">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
