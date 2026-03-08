import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, MessageCircle, Mail, Share2, Check, Send } from "lucide-react";
import { toast } from "sonner";
import { getSocialShareUrl, getShareLinks, type ShareableType } from "@/lib/social-share";

interface Props {
  serviceSlug: string;
  serviceTitle: string;
  /** Type of shareable content — defaults to "service" for concierge */
  shareType?: ShareableType;
  /** Optional photo URL to include in share messages */
  photoUrl?: string;
  /** Optional share version for social cache-busting */
  shareVersion?: string;
}

const BookingLinkShare = ({ serviceSlug, serviceTitle, shareType = "service", photoUrl, shareVersion }: Props) => {
  const [copied, setCopied] = useState(false);
  const runtimeVersion = useMemo(
    () => `${shareVersion || "base"}-${Date.now()}`,
    [serviceSlug, shareVersion]
  );
  const shareUrl = getSocialShareUrl(shareType, serviceSlug, runtimeVersion);
  const links = getShareLinks(shareType, serviceSlug, serviceTitle, runtimeVersion);

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs text-muted-foreground font-medium">Booking Link</label>

      {/* Photo preview */}
      {photoUrl && (
        <div className="rounded-lg overflow-hidden border border-border aspect-video bg-muted">
          <img src={photoUrl} alt={serviceTitle} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex gap-2">
        <Input value={shareUrl} readOnly className="text-xs" />
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => window.open(links.whatsapp, "_blank")} className="flex-1 text-xs">
          <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.open(links.telegram, "_blank")} className="flex-1 text-xs">
          <Send className="h-3 w-3 mr-1" /> Telegram
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.open(links.email, "_blank")} className="flex-1 text-xs">
          <Mail className="h-3 w-3 mr-1" /> Email
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.open(links.sms, "_blank")} className="flex-1 text-xs">
          <Share2 className="h-3 w-3 mr-1" /> SMS
        </Button>
      </div>
    </div>
  );
};

export default BookingLinkShare;

