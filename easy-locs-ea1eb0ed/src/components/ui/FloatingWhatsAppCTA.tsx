import { useState, useEffect } from "react";
import WhatsAppIcon from "./WhatsAppIcon";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { buildWhatsAppLink, sanitizePhone, triggerHaptic } from "@/lib/whatsapp-utils";

interface FloatingWhatsAppCTAProps {
  phone: string;
  message?: string;
  href?: string;
  label?: string;
}

export default function FloatingWhatsAppCTA({ phone, message, href, label }: FloatingWhatsAppCTAProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || !visible) return null;

  const cleanPhone = sanitizePhone(phone);
  const link = href || (cleanPhone && cleanPhone.length >= 7
    ? (message ? buildWhatsAppLink(phone, message) : buildWhatsAppLink(phone, ""))
    : "");

  if (!link) return null;

  return (
    <div className={cn(
      "fixed bottom-6 right-4 z-50 flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in duration-500",
      "sm:bottom-8 sm:right-6"
    )}>
      <button
        onClick={() => setDismissed(true)}
        className="h-6 w-6 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/60 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => triggerHaptic("medium")}
        className={cn(
          "flex items-center gap-2.5 px-5 py-3 rounded-full",
          "bg-[#25D366] hover:bg-[#20bd5a] text-white",
          "shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:shadow-[#25D366]/40",
          "font-semibold text-sm transition-all duration-200",
          "active:scale-95 min-h-[48px]",
        )}
      >
        <WhatsAppIcon size={20} />
        {label || "WhatsApp"}
      </a>
    </div>
  );
}
