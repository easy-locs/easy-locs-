import { useState } from "react";
import { Mail, Phone, MessageCircle, Send, MessageSquare, Link2, Lock, Download, LogIn, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { whatsappLink, telegramLink, emailLink, phoneLink, smsLink, type ListingContext } from "@/lib/contact-utils";
import { useAppInstalled } from "@/hooks/useAppInstalled";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

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
  const isInstalled = useAppInstalled();
  const navigate = useNavigate();
  const [phoneRevealed, setPhoneRevealed] = useState(false);

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

  // ── Not logged in: show login gate ──
  if (!user) {
    return (
      <div className="space-y-3 p-4 rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Lock className="h-4 w-4 text-muted-foreground" />
          {t("gate.login_to_contact") || "Login to contact this provider"}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("gate.login_desc") || "Create a free account to send messages, call providers, and access contact information."}
        </p>
        <Button onClick={() => navigate("/login")} className="w-full gap-2 min-h-[44px]">
          <LogIn className="h-4 w-4" />
          {t("gate.login_signup") || "Login / Sign up"}
        </Button>
      </div>
    );
  }

  // ── Logged in: build contact buttons ──
  const waUrl = whatsappNumber ? whatsappLink(whatsappNumber, ctx) : null;
  const tgUrl = telegramUsername ? telegramLink(telegramUsername, ctx) : null;
  const mailUrl = contactEmail ? emailLink(contactEmail, ctx) : null;

  const handleChat = () => {
    trackClick("chat", trackOpts);
    // For authenticated users, insert a message
    handleSendFirstMessage();
  };

  const handleSendFirstMessage = async () => {
    if (!user || !orgId) return;
    try {
      const { error } = await supabase.from("messages").insert({
        org_id: orgId,
        sender_id: user.id,
        content: `Hi, I'm interested in "${listingTitle}"`,
        category: "general",
        contact_name: user.user_metadata?.name || user.email,
        contact_email: user.email,
        context_id: serviceId || listingId || undefined,
        message_type: "inquiry",
        read: false,
      });
      if (error) throw error;
      toast.success(t("gate.message_sent") || "Message sent!");
    } catch {
      toast.error(t("gate.message_failed") || "Failed to send message");
    }
  };

  const handleRevealPhone = () => {
    trackClick("reveal_phone", trackOpts);
    setPhoneRevealed(true);
  };

  const handleCall = () => {
    if (!isInstalled) {
      navigate("/install");
      return;
    }
    trackClick("call", trackOpts);
    if (contactPhone) window.location.href = phoneLink(contactPhone);
  };

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

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("page.listing.contact_direct") || "Contact directly"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {/* Chat button */}
        {orgId && (
          <button
            onClick={handleChat}
            className="flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            {t("page.listing.chat") || "Chat"}
          </button>
        )}

        {/* WhatsApp — only with real WhatsApp number */}
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick("whatsapp", trackOpts)}
            className="flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        )}

        {/* Telegram */}
        {tgUrl && (
          <a
            href={tgUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackClick("telegram", trackOpts)}
            className="flex items-center justify-center gap-2 bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Send className="h-4 w-4" />
            Telegram
          </a>
        )}

        {/* Call — only on installed app */}
        {contactPhone && (
          phoneRevealed ? (
            isInstalled ? (
              <a
                href={phoneLink(contactPhone)}
                onClick={() => trackClick("call", trackOpts)}
                className="flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                <Phone className="h-4 w-4" />
                {t("page.listing.call") || "Call"}
              </a>
            ) : (
              <button
                onClick={() => navigate("/install")}
                className="flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                {t("gate.install_to_call_short") || "Install to call free"}
              </button>
            )
          ) : (
            <button
              onClick={handleRevealPhone}
              className="flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Eye className="h-4 w-4" />
              {t("gate.reveal_phone") || "Reveal phone"}
            </button>
          )
        )}

        {/* Email */}
        {mailUrl && (
          <a
            href={mailUrl}
            onClick={() => trackClick("email", trackOpts)}
            className="flex items-center justify-center gap-2 bg-accent/10 text-accent hover:bg-accent/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        )}

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 bg-muted text-muted-foreground hover:bg-muted/80 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Link2 className="h-4 w-4" />
          {t("page.listing.share") || "Share"}
        </button>
      </div>

      {/* App install nudge for web users */}
      {!isInstalled && (
        <button
          onClick={() => navigate("/install")}
          className="w-full flex items-center justify-center gap-2 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <Download className="h-3.5 w-3.5" />
          {t("gate.install_unlock") || "Install the app for free calls & full access"}
        </button>
      )}
    </div>
  );
};

export default ListingContactButtons;
