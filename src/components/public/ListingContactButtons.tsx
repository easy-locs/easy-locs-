import { useState } from "react";
import { Mail, Phone, MessageCircle, Send, MessageSquare, Link2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { whatsappLink, telegramLink, emailLink, phoneLink, smsLink, type ListingContext } from "@/lib/contact-utils";
import GuestChatDrawer from "@/components/guest/GuestChatDrawer";

interface Props {
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
  telegramUsername?: string | null;
  listingTitle?: string;
  listingUrl?: string;
  listingPrice?: string;
  listingCity?: string;
  listingCountry?: string;
  listingId?: string | null;
  serviceId?: string | null;
  orgId?: string | null;
  providerName?: string;
}

/** Fire-and-forget click tracking */
const trackClick = (channel: string, opts: { listingId?: string | null; serviceId?: string | null; orgId?: string | null }) => {
  supabase.from("contact_clicks" as any).insert({
    channel,
    listing_id: opts.listingId || null,
    service_id: opts.serviceId || null,
    org_id: opts.orgId || null,
    referrer: typeof document !== "undefined" ? document.referrer?.slice(0, 500) : null,
  } as any).then(() => {});
};

const ListingContactButtons = ({
  contactEmail, contactPhone, whatsappNumber, telegramUsername,
  listingTitle = "", listingUrl, listingPrice, listingCity, listingCountry,
  listingId, serviceId, orgId, providerName,
}: Props) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [guestChatOpen, setGuestChatOpen] = useState(false);
  const hasAny = contactEmail || contactPhone || whatsappNumber || telegramUsername || orgId;
  if (!hasAny) return null;

  const trackOpts = { listingId, serviceId, orgId };
  const ctx: ListingContext = {
    title: listingTitle,
    url: listingUrl || (typeof window !== "undefined" ? window.location.href : ""),
    price: listingPrice,
    city: listingCity,
    country: listingCountry,
  };

  const waUrl = whatsappNumber ? whatsappLink(whatsappNumber, ctx) : null;
  const tgUrl = telegramUsername ? telegramLink(telegramUsername, ctx) : null;
  const mailUrl = contactEmail ? emailLink(contactEmail, ctx) : null;
  const callUrl = contactPhone ? phoneLink(contactPhone) : null;
  const sUrl = contactPhone ? smsLink(contactPhone, ctx) : null;

  const handleShare = async () => {
    trackClick("share", trackOpts);
    const url = ctx.url || "";
    try {
      if (navigator.share) {
        await navigator.share({ title: listingTitle, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } catch {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const handleChatClick = () => {
    trackClick("chat", trackOpts);
    setGuestChatOpen(true);
  };

  const buttons: { url?: string | null; channel: string; label: string; icon: React.ReactNode; colors: string; onClick?: () => void }[] = [
    // In-app chat button (always available when orgId exists)
    ...(orgId ? [{
      channel: "chat", label: t("page.listing.chat") || "Chat",
      icon: <MessageSquare className="h-4 w-4" />,
      colors: "bg-primary/10 text-primary hover:bg-primary/20",
      onClick: handleChatClick,
    }] : []),
    {
      url: waUrl, channel: "whatsapp", label: "WhatsApp",
      icon: <MessageCircle className="h-4 w-4" />,
      colors: "bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20",
    },
    {
      url: tgUrl, channel: "telegram", label: "Telegram",
      icon: <Send className="h-4 w-4" />,
      colors: "bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20",
    },
    {
      url: callUrl, channel: "call", label: t("page.listing.call") || "Call",
      icon: <Phone className="h-4 w-4" />,
      colors: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
    },
    {
      url: sUrl, channel: "sms", label: "SMS",
      icon: <MessageSquare className="h-4 w-4" />,
      colors: "bg-sky-500/10 text-sky-600 hover:bg-sky-500/20",
    },
    {
      url: mailUrl, channel: "email", label: "Email",
      icon: <Mail className="h-4 w-4" />,
      colors: "bg-accent/10 text-accent hover:bg-accent/20",
    },
  ];

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("page.listing.contact_direct") || "Contact directly"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {buttons
            .filter((b) => b.url || b.onClick)
            .map((b) =>
              b.onClick ? (
                <button
                  key={b.channel}
                  onClick={b.onClick}
                  className={`flex items-center justify-center gap-2 ${b.colors} px-3 py-2.5 rounded-xl text-sm font-medium transition-colors`}
                >
                  {b.icon}
                  {b.label}
                </button>
              ) : (
                <a
                  key={b.channel}
                  href={b.url!}
                  target={b.channel === "whatsapp" || b.channel === "telegram" ? "_blank" : undefined}
                  rel={b.channel === "whatsapp" || b.channel === "telegram" ? "noopener noreferrer" : undefined}
                  onClick={() => trackClick(b.channel, trackOpts)}
                  className={`flex items-center justify-center gap-2 ${b.colors} px-3 py-2.5 rounded-xl text-sm font-medium transition-colors`}
                >
                  {b.icon}
                  {b.label}
                </a>
              )
            )}
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 bg-muted text-muted-foreground hover:bg-muted/80 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Link2 className="h-4 w-4" />
            {t("page.listing.share") || "Share"}
          </button>
        </div>
      </div>

      {orgId && (
        <GuestChatDrawer
          open={guestChatOpen}
          onClose={() => setGuestChatOpen(false)}
          providerName={providerName || "Provider"}
          serviceTitle={listingTitle}
          orgId={orgId}
          contextType={serviceId ? "service" : listingId ? "listing" : "general"}
          contextId={serviceId || listingId || undefined}
          providerPhone={contactPhone || undefined}
          providerWhatsApp={whatsappNumber || undefined}
          listingUrl={listingUrl}
          listingPrice={listingPrice}
          listingCity={listingCity}
        />
      )}
    </>
  );
};

export default ListingContactButtons;
