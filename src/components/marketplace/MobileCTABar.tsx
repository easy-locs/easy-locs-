import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Share2 } from "lucide-react";
import { getShareLinks, type ShareableType } from "@/lib/social-share";
import { toast } from "sonner";

interface MobileCTABarProps {
  phone?: string;
  whatsapp?: string;
  shareType: ShareableType;
  shareSlug: string;
  shareTitle: string;
  onBook: () => void;
  priceLine?: string;
}

export default function MobileCTABar({ phone, whatsapp, shareType, shareSlug, shareTitle, onBook, priceLine }: MobileCTABarProps) {
  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`
    : null;

  const handleShare = async () => {
    const links = getShareLinks(shareType, shareSlug, shareTitle);
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: links.copy });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(links.copy);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:hidden">
      <div className="flex items-center gap-2">
        {priceLine && (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-accent truncate block">{priceLine}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {phone && (
            <Button size="icon" variant="outline" className="h-10 w-10" asChild>
              <a href={`tel:${phone}`}><Phone className="h-4 w-4" /></a>
            </Button>
          )}
          {whatsappLink && (
            <Button size="icon" variant="outline" className="h-10 w-10 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10" asChild>
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /></a>
            </Button>
          )}
          <Button size="icon" variant="outline" className="h-10 w-10" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button className="h-10 px-5 font-semibold shadow-sm" onClick={onBook}>
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
}
