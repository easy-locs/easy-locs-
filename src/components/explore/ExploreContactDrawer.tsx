/**
 * ExploreContactDrawer — Allows visitors to contact a provider directly from Explore.
 * Opens as a sheet/drawer. If not logged in, prompts to sign up.
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2, LogIn } from "lucide-react";

interface ExploreContactDrawerProps {
  open: boolean;
  onClose: () => void;
  providerName: string;
  serviceTitle: string;
  serviceId: string;
  orgId: string;
}

export default function ExploreContactDrawer({
  open, onClose, providerName, serviceTitle, serviceId, orgId,
}: ExploreContactDrawerProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const senderName = user?.user_metadata?.name || name.trim();
    const senderEmail = user?.email || email.trim();

    if (!senderName || !senderEmail) {
      toast.error("Please fill in your name and email");
      return;
    }
    if (!message.trim()) {
      toast.error("Please write a message");
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: user?.id || "00000000-0000-0000-0000-000000000000",
        content: message.trim(),
        category: "general",
        contact_name: senderName,
        contact_email: senderEmail.toLowerCase(),
        context_id: serviceId,
        message_type: "inquiry",
        read: false,
      });

      if (error) throw error;

      toast.success("Message sent! The provider will reply soon.");
      setMessage("");
      setName("");
      setEmail("");
      onClose();
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] pb-safe">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-left">
            <MessageSquare className="h-5 w-5 text-accent" />
            Contact {providerName}
          </SheetTitle>
          <p className="text-sm text-muted-foreground text-left">{serviceTitle}</p>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {!user && (
            <>
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[44px]"
              />
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-[44px]"
              />
            </>
          )}

          <Textarea
            placeholder="Write your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="resize-none"
          />

          <div className="flex gap-2">
            <Button onClick={handleSend} disabled={sending} className="flex-1 gap-2 min-h-[44px]">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </div>

          {!user && (
            <button
              onClick={() => { onClose(); navigate("/signup"); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-1"
            >
              <LogIn className="h-3 w-3" /> Sign up for faster replies and booking tracking
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
