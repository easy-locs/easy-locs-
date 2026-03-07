import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, MessageCircle, Mail, Share2, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  serviceSlug: string;
  serviceTitle: string;
}

const BookingLinkShare = ({ serviceSlug, serviceTitle }: Props) => {
  const [copied, setCopied] = useState(false);
  const baseUrl = window.location.origin;
  const bookingUrl = `${baseUrl}/book/${serviceSlug}`;

  const copy = async () => {
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Book ${serviceTitle}: ${bookingUrl}`)}`, "_blank");
  };

  const shareEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(`Book: ${serviceTitle}`)}&body=${encodeURIComponent(`Book this service: ${bookingUrl}`)}`, "_blank");
  };

  const shareSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(`Book ${serviceTitle}: ${bookingUrl}`)}`, "_blank");
  };

  return (
    <div className="space-y-3">
      <label className="text-xs text-muted-foreground font-medium">Booking Link</label>
      <div className="flex gap-2">
        <Input value={bookingUrl} readOnly className="text-xs" />
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={shareWhatsApp} className="flex-1 text-xs">
          <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={shareEmail} className="flex-1 text-xs">
          <Mail className="h-3 w-3 mr-1" /> Email
        </Button>
        <Button size="sm" variant="outline" onClick={shareSMS} className="flex-1 text-xs">
          <Share2 className="h-3 w-3 mr-1" /> SMS
        </Button>
      </div>
    </div>
  );
};

export default BookingLinkShare;
