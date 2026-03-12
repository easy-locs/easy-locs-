import { useState } from "react";
import { Mail, Phone, MessageCircle, Send, MessageSquare, Link2, Lock, Download, LogIn, Eye, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { whatsappLink, telegramLink, emailLink, phoneLink, type ListingContext } from "@/lib/contact-utils";
import { useAppInstalled } from "@/hooks/useAppInstalled";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  /** Masked phone from public RPC (e.g. "+3365••••") — never a real number */
  contactPhone?: string | null;
  contactEmail?: string | null;
  whatsappNumber?: string | null;
  telegramUsername?: string | null;
  /** Flags from public RPC indicating contact availability */
  hasPhone?: boolean;
  hasWhatsapp?: boolean;
  listingTitle?: string;
  listingUrl?: string;
  listingPrice?: string;
  listingCity?: string;
  listingCountry?: string;
  listingId?: string | null;
  serviceId?: string | null;
  orgId?: string | null;
  providerName?: string;
  /** Source type for secure reveal: "real_estate" | "seasonal" | "marketplace" | "concierge" */
  source?: string;
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

/** Get or create a conversation thread */
async function getOrCreateThread(userId: string, orgId: string, opts: {
  contextType?: string; contextId?: string; listingTitle?: string; listingUrl?: string; providerName?: string;
}): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from("conversation_threads")
      .select("id")
      .eq("org_id", orgId)
      .eq("initiator_id", userId)
      .eq("context_id", opts.contextId || "")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (existing) return existing.id;

    const { data: thread, error } = await supabase
      .from("conversation_threads")
      .insert({
        org_id: orgId,
        initiator_id: userId,
        participant_ids: [userId],
        context_type: opts.contextType || "listing",
        context_id: opts.contextId || null,
        listing_title: opts.listingTitle || null,
        listing_url: opts.listingUrl || null,
        provider_name: opts.providerName || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return thread?.id || null;
  } catch { return null; }
}

/** Securely reveal contact data via backend function */
async function secureReveal(revealType: string, opts: {
  orgId?: string | null; listingId?: string | null; serviceId?: string | null; source?: string;
}): Promise<{ value: string | null; remaining: number }> {
  const { data, error } = await supabase.functions.invoke("reveal-contact", {
    body: {
      reveal_type: revealType,
      org_id: opts.orgId || null,
      listing_id: opts.listingId || null,
      service_id: opts.serviceId || null,
      source: opts.source || "real_estate",
    },
  });

  if (error) throw error;
  if (data?.error) {
    if (data.error === "Daily reveal limit reached") {
      throw new Error(`Daily limit reached (${data.limit}/day). Try again tomorrow.`);
    }
    throw new Error(data.error);
  }
  return { value: data?.[revealType] || null, remaining: data?.remaining ?? 0 };
}

const ListingContactButtons = ({
  contactEmail, contactPhone, whatsappNumber, telegramUsername,
  hasPhone, hasWhatsapp,
  listingTitle = "", listingUrl, listingPrice, listingCity, listingCountry,
  listingId, serviceId, orgId, providerName, source,
}: Props) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const isInstalled = useAppInstalled();
  const navigate = useNavigate();
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [revealedWa, setRevealedWa] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [messageSending, setMessageSending] = useState(false);

  // Determine if phone/whatsapp exist (from flags or masked props)
  const phoneAvailable = hasPhone || !!contactPhone;
  const waAvailable = hasWhatsapp || !!whatsappNumber;

  const hasAny = contactEmail || phoneAvailable || waAvailable || telegramUsername || orgId;
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

  // ── Handlers ──
  const handleChat = async () => {
    if (!user || !orgId) return;
    setMessageSending(true);
    trackClick("chat", trackOpts);
    try {
      // Check inquiry quota
      const { data: quota } = await supabase.rpc("check_inquiry_quota", { _user_id: user.id });
      if (quota && !quota.allowed) {
        toast.error(`Inquiry limit reached (${quota.limit}/hour). Please wait.`);
        setMessageSending(false);
        return;
      }

      const threadId = await getOrCreateThread(user.id, orgId, {
        contextType: serviceId ? "service" : "listing",
        contextId: serviceId || listingId || "",
        listingTitle,
        listingUrl: ctx.url,
        providerName,
      });

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
        thread_id: threadId,
      });
      if (error) throw error;
      toast.success(t("gate.message_sent") || "Message sent!");
    } catch {
      toast.error(t("gate.message_failed") || "Failed to send message");
    }
    setMessageSending(false);
  };

  const handleRevealPhone = async () => {
    setRevealLoading(true);
    trackClick("reveal_phone", trackOpts);
    try {
      const { value } = await secureReveal("phone", { ...trackOpts, source });
      if (value) {
        setRevealedPhone(value);
      } else {
        toast.error("Phone number not available");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reveal phone");
    }
    setRevealLoading(false);
  };

  const handleRevealWhatsApp = async () => {
    setRevealLoading(true);
    trackClick("reveal_whatsapp", trackOpts);
    try {
      const { value } = await secureReveal("whatsapp", { ...trackOpts, source });
      if (value) {
        setRevealedWa(value);
      } else {
        toast.error("WhatsApp not available");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to reveal WhatsApp");
    }
    setRevealLoading(false);
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

  const tgUrl = telegramUsername ? telegramLink(telegramUsername, ctx) : null;
  const mailUrl = contactEmail ? emailLink(contactEmail, ctx) : null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("page.listing.contact_direct") || "Contact directly"}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {/* Chat */}
        {orgId && (
          <button
            onClick={handleChat}
            disabled={messageSending}
            className="flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            {messageSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {t("page.listing.chat") || "Chat"}
          </button>
        )}

        {/* WhatsApp — secure reveal */}
        {waAvailable && (
          revealedWa ? (
            <a
              href={whatsappLink(revealedWa, ctx)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick("whatsapp", trackOpts)}
              className="flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          ) : (
            <button
              onClick={handleRevealWhatsApp}
              disabled={revealLoading}
              className="flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {revealLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              WhatsApp
            </button>
          )
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

        {/* Phone — secure reveal + app-only call */}
        {phoneAvailable && (
          revealedPhone ? (
            isInstalled ? (
              <a
                href={phoneLink(revealedPhone)}
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
              disabled={revealLoading}
              className="flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {revealLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
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

      {/* App install nudge */}
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
