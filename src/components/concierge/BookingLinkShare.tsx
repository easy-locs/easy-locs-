import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, MessageCircle, Mail, Share2, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { getCleanShareUrl, getSocialShareUrl } from "@/lib/social-share";

interface Props {
  serviceSlug: string;
  serviceTitle: string;
  shareType?: string;
  photoUrl?: string;
  shareVersion?: string;
}

/**
 * Share booking links with product photo in social previews.
 * - Copy button: stable clean SPA link (easy-locs.com/book/slug)
 * - Social buttons: route through social-preview edge function
 *   so crawlers (WhatsApp, Telegram, iMessage) see og:image with product photo.
 */
const BookingLinkShare = ({ serviceSlug, serviceTitle, photoUrl, shareVersion }: Props) => {
  const [copied, setCopied] = useState(false);

  // Clean URL for display and copy
  const cleanLink = getCleanShareUrl("service", serviceSlug);
  // Social URL with OG tags for crawlers
  const socialLink = getSocialShareUrl("service", serviceSlug, shareVersion || undefined);

  const copy = async () => {
    await navigator.clipboard.writeText(cleanLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const openShare = (platform: "whatsapp" | "telegram" | "email" | "sms") => {
    const encodedTitle = encodeURIComponent(serviceTitle);

    // WhatsApp & Telegram use social URL for OG preview; Email & SMS use clean URL
    const targets: Record<string, string> = {
      whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodeURIComponent(socialLink)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(socialLink)}&text=${encodedTitle}`,
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
