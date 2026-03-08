import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, MessageCircle, Mail, Share2, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { getSocialShareUrl, type ShareableType } from "@/lib/social-share";
import { buildAppUrl } from "@/lib/app-domain";

interface Props {
  serviceSlug: string;
  serviceTitle: string;
  shareType?: ShareableType;
  photoUrl?: string;
  shareVersion?: string;
}

const BookingLinkShare = ({ serviceSlug, serviceTitle, shareType = "service", photoUrl, shareVersion }: Props) => {
  const [copied, setCopied] = useState(false);
  const publicLink = buildAppUrl(`/book/${encodeURIComponent(serviceSlug)}`);

  const getShareUrl = () => {
    const seed = shareVersion ? Date.parse(shareVersion) : NaN;
    const base = Number.isNaN(seed) ? Date.now() : Math.max(seed, Date.now());
    return getSocialShareUrl(shareType, serviceSlug, String(base));
  };

  const copy = async () => {
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  /** Navigate directly — avoids popup blockers on mobile */
  const openShare = (platform: "whatsapp" | "telegram" | "email" | "sms") => {
    const url = getShareUrl();
    const encoded = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(serviceTitle);

    const targets: Record<string, string> = {
      whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encoded}`,
      telegram: `https://t.me/share/url?url=${encoded}&text=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedTitle}%20${encoded}`,
      sms: `sms:?body=${encodedTitle}%20${encoded}`,
    };

    const target = targets[platform];
    // Use location.href for protocol handlers (sms, mailto) on mobile
    if (platform === "sms" || platform === "email") {
      window.location.href = target;
    } else {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-xs text-muted-foreground font-medium">Booking Link</label>

      {/* Photo preview if available */}
      {photoUrl && (
        <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-video max-h-32">
          <img src={photoUrl} alt={serviceTitle} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex gap-2">
        <Input value={publicLink} readOnly className="text-xs" />
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Share via social to display product photo preview automatically.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button size="sm" variant="outline" onClick={() => openShare("whatsapp")} className="text-xs">
          <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
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
