import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Send, Mail, Share2 } from "lucide-react";
import { whatsappLink, telegramLink, emailLink, type ListingContext } from "@/lib/contact-utils";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface MobileCTABarProps {
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  email?: string;
  listingTitle: string;
  listingUrl?: string;
  listingPrice?: string;
  onBook: () => void;
  priceLine?: string;
}

export default function MobileCTABar({ phone, whatsapp, telegram, email, listingTitle, listingUrl, listingPrice, onBook, priceLine }: MobileCTABarProps) {
  const { t } = useI18n();

  const ctx: ListingContext = {
    title: listingTitle,
    url: listingUrl || (typeof window !== "undefined" ? window.location.href : ""),
    price: listingPrice,
  };

  const handleShare = async () => {
    const url = ctx.url || "";
    if (navigator.share) {
      try { await navigator.share({ title: listingTitle, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t("mp.link_copied") || "Link copied!");
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:hidden">
      <div className="flex items-center gap-2">
        {priceLine && (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-accent break-words block leading-snug">{priceLine}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {whatsapp && (
            <Button size="icon" variant="outline" className="h-11 w-11 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10" asChild>
              <a href={whatsappLink(whatsapp, ctx)} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>
          )}
          {telegram && (
            <Button size="icon" variant="outline" className="h-11 w-11 text-[#0088cc] border-[#0088cc]/30 hover:bg-[#0088cc]/10" asChild>
              <a href={telegramLink(telegram, ctx)} target="_blank" rel="noopener noreferrer">
                <Send className="h-4 w-4" />
              </a>
            </Button>
          )}
          {email && (
            <Button size="icon" variant="outline" className="h-11 w-11" asChild>
              <a href={emailLink(email, ctx)}>
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          )}
          {phone && (
            <Button size="icon" variant="outline" className="h-11 w-11" asChild>
              <a href={`tel:${phone}`}><Phone className="h-4 w-4" /></a>
            </Button>
          )}
          <Button size="icon" variant="outline" className="h-11 w-11" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button className="h-11 px-5 font-semibold shadow-sm" onClick={onBook}>
            {t("mp.book_now") || "Book Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
