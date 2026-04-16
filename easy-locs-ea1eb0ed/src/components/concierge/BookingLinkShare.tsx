import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Mail, Share2, Check, Send } from "lucide-react";
import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { toast } from "sonner";
import { getCleanShareUrl } from "@/lib/social-share";
import { buildWhatsAppShareLink } from "@/lib/whatsapp-utils";

interface Props {
  serviceSlug: string;
  serviceTitle: string;
  shareType?: string;
  photoUrl?: string;
  shareVersion?: string;
}

/**
 * Share booking links via WhatsApp, Telegram, Email, SMS.
 * All channels use the branded clean URL (easy-locs.com/book/slug).
 */
const BookingLinkShare = ({ serviceSlug, serviceTitle, photoUrl }: Props) => {
  const [copied, setCopied] = useState(false);

  const cleanLink = getCleanShareUrl("service", serviceSlug);

  const copy = async () => {
    const { copyToClipboard } = await import("@/lib/clipboard");
    const r = await copyToClipboard(cleanLink);
    if (r.ok) {
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openShare = (platform: "whatsapp" | "telegram" | "email" | "sms") => {
    const encodedTitle = encodeURIComponent(serviceTitle);

    const targets: Record<string, string> = {
      whatsapp: buildWhatsAppShareLink(`${serviceTitle}\n\n${cleanLink}`),
      telegram: `https://t.me/share/url?url=${encodeURIComponent(cleanLink)}&text=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedTitle}%20${encodeURIComponent(cleanLink)}`,
      sms: `sms:?body=${encodedTitle}%20${encodeURIComponent(cleanLink)}`,
    };

    const target = targets[platform];
    if (platform === "sms" || platform === "email") {
      window.location.href = target;
    } else {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-xs text-muted-foreground font-medium">Booking Link</label>

      {photoUrl && (
        <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted/50 p-2">
          <img src={photoUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" loading="lazy" />
          <span className="min-w-0 whitespace-normal break-words text-xs text-muted-foreground leading-snug">{serviceTitle}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Input value={cleanLink} readOnly className="text-xs" />
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button size="sm" variant="outline" onClick={() => openShare("whatsapp")} className="text-xs">
          <WhatsAppIcon size={12} className="mr-1" /> WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={() => openShare("telegram")} className="text-xs">
          <Send className="h-3 w-3 mr-1" /> Telegram
        </Button>
        <Button size="sm" variant="outline" onClick={() => openShare("email")} className="text-xs">
          <Mail className="h-3 w-3 mr-1" /> Email
        </Button>
        <Button size="sm" variant="outline" onClick={() => openShare("sms")} className="text-xs">
          <Share2 className="h-3 w-3 mr-1" /> SMS
        </Button>
      </div>
    </div>
  );
};

export default BookingLinkShare;
