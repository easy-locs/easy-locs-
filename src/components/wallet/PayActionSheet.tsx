/**
 * PayActionSheet — Direct payment action sheet.
 * Three clear options: Scan QR, Payment link, Choose contact.
 */
import { useState } from "react";
import { ScanLine, Link2, Users, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PayActionSheetProps {
  onClose: () => void;
}

export default function PayActionSheet({ onClose }: PayActionSheetProps) {
  const navigate = useNavigate();
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [resolving, setResolving] = useState(false);

  const handleScan = () => {
    onClose();
    navigate("/pay/scan");
  };

  const handleContact = () => {
    onClose();
    navigate("/wallet/transfer");
  };

  const handleLink = () => {
    setShowLinkInput(true);
  };

  const resolveLink = async () => {
    const trimmed = linkValue.trim();
    if (!trimmed) { toast.error("Paste a payment link or user ID"); return; }

    setResolving(true);
    try {
      // Try as user ID first
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("id", trimmed)
        .maybeSingle();

      if (profile?.id) {
        onClose();
        navigate(`/wallet/transfer?to=${profile.id}`);
        return;
      }

      // Try as email
      const { data: emailProfile } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("email", trimmed)
        .maybeSingle();

      if (emailProfile?.id) {
        onClose();
        navigate(`/wallet/transfer?to=${emailProfile.id}`);
        return;
      }

      // Try as QR payload URL
      if (trimmed.startsWith("http")) {
        onClose();
        navigate("/pay/scan");
        toast.info("Open the scanner to process this link");
        return;
      }

      toast.error("No user found with this ID or email");
    } catch {
      toast.error("Failed to resolve link");
    } finally {
      setResolving(false);
    }
  };

  if (showLinkInput) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Paste payment link or user ID</p>
        <input
          autoFocus
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          placeholder="User ID, email, or link…"
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex gap-2">
          <button
            onClick={() => setShowLinkInput(false)}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground"
          >
            Back
          </button>
          <button
            onClick={resolveLink}
            disabled={resolving || !linkValue.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Go
          </button>
        </div>
      </div>
    );
  }

  const actions = [
    {
      key: "scan",
      icon: ScanLine,
      label: "Scan QR",
      desc: "Point camera at a QR code to pay",
      handler: handleScan,
    },
    {
      key: "link",
      icon: Link2,
      label: "Payment link",
      desc: "Paste a payment link or user ID",
      handler: handleLink,
    },
    {
      key: "contact",
      icon: Users,
      label: "Send to contact",
      desc: "Transfer money to a user",
      handler: handleContact,
    },
  ];

  return (
    <div className="space-y-2">
      {actions.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={action.handler}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-accent/40 hover:shadow-sm active:scale-[0.98]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{action.label}</p>
              <p className="text-[11px] text-muted-foreground">{action.desc}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
