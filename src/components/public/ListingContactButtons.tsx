import { useState } from "react";
import { Mail, Phone, MessageSquare, Lock, LogIn, Eye, Loader2 } from "lucide-react";
import { PhoneCall } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import * as contactRepo from "@/repositories/listing-contact.repository";
import { toast } from "sonner";
import { emailLink, type ListingContext } from "@/lib/contact-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCall } from "@/components/call/CallProvider";

interface Props {
  contactPhone?: string | null;
  contactEmail?: string | null;
  whatsappNumber?: string | null;
  telegramUsername?: string | null;
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
  source?: string;
}

const trackClick = (channel: string, opts: { listingId?: string | null; serviceId?: string | null; orgId?: string | null }) => {
  contactRepo.trackContactClick(channel, opts);
};

async function getOrCreateV2Conversation(userId: string, orgId: string, opts: {
  contextType?: string; contextId?: string; listingTitle?: string; listingUrl?: string; providerName?: string;
}): Promise<string | null> {
  try {
    const existingId = await contactRepo.findExistingConversation(opts.contextId || "");
    if (existingId) return existingId;

    const creatorOrbitId = await contactRepo.resolveOrbitId(userId);
    const org = await contactRepo.fetchOrgOwner(orgId);

    const participants = [
      { userId, orbitId: creatorOrbitId },
      ...(org?.owner_user_id ? [{ userId: org.owner_user_id, orbitId: `orbit_${org.owner_user_id.slice(0, 12)}` }] : []),
    ];

    return await contactRepo.createV2Conversation({
      type: "inquiry",
      title: opts.listingTitle || null,
      listing_id: opts.contextId || null,
      created_by_orbit_id: creatorOrbitId,
      participants,
      metadata: {
        org_id: orgId,
        context_type: opts.contextType || "listing",
        provider_name: opts.providerName || null,
      },
      last_message_at: new Date().toISOString(),
    });
  } catch { return null; }
}

async function secureReveal(revealType: string, opts: {
  orgId?: string | null; listingId?: string | null; serviceId?: string | null; source?: string;
}): Promise<{ value: string | null; remaining: number }> {
  return contactRepo.secureRevealContact(revealType, opts);
}

const ListingContactButtons = ({
  contactEmail, contactPhone, whatsappNumber, telegramUsername,
  hasPhone, hasWhatsapp,
  listingTitle = "", listingUrl, listingPrice, listingCity, listingCountry,
  listingId, serviceId, orgId, providerName, source,
}: Props) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { startCall, isInCall, isStartingCall } = useCall();
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [messageSending, setMessageSending] = useState(false);

  const phoneAvailable = hasPhone || !!contactPhone;
  const hasAny = contactEmail || phoneAvailable || orgId;
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

  // ── Send message → navigate to V2 conversation ──
  const handleSendMessage = async () => {
    if (!user || !orgId) return;
    setMessageSending(true);
    trackClick("chat", trackOpts);
    try {
      const quota = await contactRepo.checkInquiryQuota(user.id);
      if (quota && !(quota as any).allowed) {
        toast.error(`Inquiry limit reached (${(quota as any).limit}/hour). Please wait.`);
        setMessageSending(false);
        return;
      }

      const convId = await getOrCreateV2Conversation(user.id, orgId, {
        contextType: serviceId ? "service" : "listing",
        contextId: serviceId || listingId || "",
        listingTitle,
        listingUrl: ctx.url,
        providerName,
      });

      if (!convId) throw new Error("Failed to create conversation");

      const senderOrbitId = await contactRepo.resolveOrbitId(user.id);

      const msgBody = `Hi, I'm interested in "${listingTitle}"`;
      await contactRepo.insertV2ChatMessage({
        conversation_id: convId,
        sender_user_id: user.id,
        sender_orbit_id: senderOrbitId,
        type: "text",
        body: msgBody,
        metadata: {
          source: "listing_contact",
          listing_id: listingId || serviceId || null,
        },
      });

      await contactRepo.updateV2ConversationPreview(convId, msgBody);

      toast.success(t("gate.message_sent") || "Message sent!");
      navigate(`/orbit?conversation=${convId}`);
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


  const handleFreeCall = () => {
    if (!user || !orgId) return;
    trackClick("free_call", trackOpts);
    startCall({
      targetId: orgId,
      contextType: serviceId ? "service" : "listing",
      contextId: serviceId || listingId || undefined,
      contextLabel: listingTitle,
      peerName: providerName || "Provider",
      isVideo: false,
    });
  };

  const mailUrl = contactEmail ? emailLink(contactEmail, ctx) : null;

  return (
    <div className="space-y-3">
      {/* ── Contact directly ── */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t("page.listing.contact_direct") || "Contact directly"}
      </p>
      <div className="space-y-2">
        {/* Call for free — in-app call */}
        {orgId && (
          <button
            onClick={handleFreeCall}
            disabled={isInCall || isStartingCall}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 px-4 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {isStartingCall ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PhoneCall className="h-4 w-4" />
            )}
            {isStartingCall
              ? (t("page.listing.calling") || "Calling…")
              : (t("page.listing.call_free") || "Call for free")}
          </button>
        )}

        {/* Send message */}
        {orgId && (
          <button
            onClick={handleSendMessage}
            disabled={messageSending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {messageSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {t("page.listing.send_message") || "Send message"}
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {/* Reveal phone → show masked number, call reveals full */}
          {phoneAvailable && (
            revealedPhone ? (
              <div className="col-span-2 flex items-center gap-2">
                <div className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-600 px-3 py-2.5 rounded-xl text-sm font-medium">
                  <Phone className="h-4 w-4" />
                  {revealedPhone.slice(0, -4).replace(/./g, (c, i) => i < 6 ? c : "•") + revealedPhone.slice(-2)}
                </div>
                <a
                  href={`tel:${revealedPhone}`}
                  onClick={() => trackClick("call", trackOpts)}
                  className="flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px]"
                >
                  <Phone className="h-4 w-4" />
                  {t("page.listing.call") || "Call"}
                </a>
              </div>
            ) : (
              <button
                onClick={handleRevealPhone}
                disabled={revealLoading}
                className="flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
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
              className="flex items-center justify-center gap-2 bg-accent/10 text-accent hover:bg-accent/20 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px]"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingContactButtons;
