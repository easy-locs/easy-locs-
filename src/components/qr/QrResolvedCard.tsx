import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UserPlus, MessageCircle, Send, Store, ExternalLink, Heart, RefreshCcw, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateDirectThread } from "@/lib/direct-thread";
import { Button } from "@/components/ui/button";
import type { UniversalQrPayload } from "@/lib/qr-engine";

type OpenPaymentFn = (req: {
  amount: number;
  currency?: string;
  title?: string;
  subtitle?: string;
  recipientId?: string;
  recipientName?: string;
  contextType?: string;
  contextId?: string | null;
  metadata?: Record<string, unknown>;
}) => Promise<{ ok: boolean; transactionId?: string; error?: string }>;

type ShopRow = {
  id: string;
  slug: string;
  name: string | null;
  user_id: string;
};

type ExistingThread = {
  contextId?: string;
  orgId?: string;
  threadId?: string;
};

export function QrResolvedCard({
  payload,
  openPayment,
  onReset,
  currentUserId,
  currentOrgId,
}: {
  payload: UniversalQrPayload;
  openPayment: OpenPaymentFn;
  onReset: () => void;
  currentUserId?: string;
  currentOrgId?: string | null;
}) {
  const navigate = useNavigate();

  const [busy, setBusy] = useState<string | null>(null);

  // user/contact state
  const [contactAdded, setContactAdded] = useState(false);
  const [existingThread, setExistingThread] = useState<ExistingThread | null>(null);
  const [userLoadedName, setUserLoadedName] = useState<string | null>(null);

  // shop state
  const [followed, setFollowed] = useState(false);
  const [shopRow, setShopRow] = useState<ShopRow | null>(null);

  const isUserPayload =
    payload.action === "profile" ||
    payload.action === "add_contact" ||
    payload.action === "pay_user";

  const isShopPayload =
    payload.action === "shop" ||
    payload.action === "pay_shop";

  const userId =
    isUserPayload && "userId" in payload ? (payload as any).userId : null;

  const shopSlug =
    isShopPayload && "shopSlug" in payload ? (payload as any).shopSlug : null;

  const displayUserName =
    (payload as any)?.name ||
    userLoadedName ||
    "User";

  const displayShopName =
    shopRow?.name ||
    (shopSlug ? shopSlug.replace(/-/g, " ") : "Shop");

  // ─────────────────────────────────────
  // preload relationship state for user
  // ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadUserState() {
      if (!currentUserId || !userId || userId === currentUserId) return;

      try {
        const [{ data: profile }, { data: existingContact }] = await Promise.all([
          supabase
            .from("profiles")
            .select("name")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("contacts")
            .select("id")
            .eq("owner_id", currentUserId)
            .eq("contact_user_id", userId)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        if (profile?.name) setUserLoadedName(profile.name);
        setContactAdded(!!existingContact);

        // Check if a thread already exists (without creating one)
        try {
          const { data: threadRow } = await supabase
            .from("conversation_threads")
            .select("id, context_id")
            .contains("participant_ids", [currentUserId, userId])
            .eq("context_type", "direct")
            .limit(1)
            .maybeSingle();

          if (!cancelled && threadRow) {
            setExistingThread({
              contextId: threadRow.context_id || undefined,
              threadId: threadRow.id,
            });
          }
        } catch {
          // no-op: thread existence is nice-to-have
        }
      } catch (e) {
        console.error("[qr-user-state]", e);
      }
    }

    loadUserState();
    return () => { cancelled = true; };
  }, [currentUserId, userId]);

  // ─────────────────────────────────────
  // preload relationship state for shop
  // ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadShopState() {
      if (!shopSlug) return;

      try {
        const { data: shop } = await supabase
          .from("storefront_pages")
          .select("id, slug, name, user_id")
          .eq("slug", shopSlug)
          .maybeSingle();

        if (cancelled) return;
        if (shop) setShopRow(shop as ShopRow);

        if (currentUserId && shop?.id) {
          const { data: follow } = await supabase
            .from("shop_follows")
            .select("user_id, shop_id")
            .eq("user_id", currentUserId)
            .eq("shop_id", shop.id)
            .maybeSingle() as any;

          if (!cancelled) setFollowed(!!follow);
        }
      } catch (e) {
        console.error("[qr-shop-state]", e);
      }
    }

    loadShopState();
    return () => { cancelled = true; };
  }, [currentUserId, shopSlug]);

  // ─────────────────────────────────────
  // actions: contacts / threads
  // ─────────────────────────────────────
  async function handleAddContact() {
    if (!currentUserId || !userId) {
      toast.error("Please sign in first");
      return;
    }
    if (userId === currentUserId) {
      toast.info("This is your own profile");
      return;
    }

    setBusy("contact");

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", userId)
        .maybeSingle();

      const { error } = await supabase.from("contacts").insert({
        owner_id: currentUserId,
        org_id: currentOrgId || null,
        name: profile?.name || displayUserName,
        email: profile?.email || null,
        contact_user_id: userId,
        category: "professional",
      } as any);

      if (error) {
        if ((error as any).code === "23505") {
          setContactAdded(true);
          toast.info("Already in your contacts");
        } else {
          throw error;
        }
      } else {
        setContactAdded(true);
        toast.success("Contact added");
      }
    } catch (e) {
      console.error("[qr-add-contact]", e);
      toast.error("Failed to add contact");
    } finally {
      setBusy(null);
    }
  }

  async function handleOpenChat() {
    if (!currentUserId || !userId) {
      toast.error("Please sign in first");
      return;
    }

    setBusy("chat");

    try {
      const thread = await getOrCreateDirectThread({
        currentUserId,
        targetUserId: userId,
        targetName: displayUserName,
      });

      if (thread) {
        navigate(`/client/messages?thread=${thread.contextId}`);
      } else {
        toast.error("Could not open conversation");
      }
    } catch (e) {
      console.error("[qr-open-chat]", e);
      toast.error("Failed to open chat");
    } finally {
      setBusy(null);
    }
  }

  async function handlePayUser() {
    if (!userId) return;

    setBusy("pay");

    try {
      await openPayment({
        amount:
          "amount" in payload && typeof payload.amount === "number"
            ? payload.amount
            : 0,
        currency:
          "currency" in payload && payload.currency
            ? payload.currency
            : "AED",
        title: `Pay ${displayUserName}`,
        subtitle: "Scanned via QR",
        recipientId: userId,
        recipientName: displayUserName,
        contextType: "generic",
        contextId: userId,
        metadata: {
          source: "qr_scan",
          qr_type: payload.action,
        },
      });
    } catch (e) {
      console.error("[qr-pay-user]", e);
      toast.error("Failed to open payment");
    } finally {
      setBusy(null);
    }
  }

  // ─────────────────────────────────────
  // actions: shop
  // ─────────────────────────────────────
  async function handleFollowShop() {
    if (!currentUserId) {
      toast.error("Please sign in first");
      return;
    }
    if (!shopRow?.id) {
      toast.error("Shop not found");
      return;
    }

    setBusy("follow");

    try {
      const { error } = await supabase.from("shop_follows").insert({
        user_id: currentUserId,
        shop_id: shopRow.id,
      } as any);

      if (error) {
        if ((error as any).code === "23505") {
          setFollowed(true);
          toast.info("Already following this shop");
        } else {
          throw error;
        }
      } else {
        setFollowed(true);
        toast.success("Shop followed");
      }
    } catch (e) {
      console.error("[qr-follow-shop]", e);
      toast.error("Failed to follow shop");
    } finally {
      setBusy(null);
    }
  }

  async function handleMessageShop() {
    if (!currentUserId) {
      toast.error("Please sign in first");
      return;
    }
    if (!shopRow?.user_id) {
      toast.error("Shop owner not found");
      return;
    }

    setBusy("message");

    try {
      const thread = await getOrCreateDirectThread({
        currentUserId,
        targetUserId: shopRow.user_id,
        targetName: shopRow.name || displayShopName,
      });

      if (thread) {
        navigate(`/client/messages?thread=${thread.contextId}`);
      } else {
        toast.error("Could not open conversation");
      }
    } catch (e) {
      console.error("[qr-message-shop]", e);
      toast.error("Failed to message shop");
    } finally {
      setBusy(null);
    }
  }

  async function handlePayShop() {
    if (!shopSlug) return;

    setBusy("pay");

    try {
      await openPayment({
        amount:
          "amount" in payload && typeof payload.amount === "number"
            ? payload.amount
            : 0,
        currency:
          "currency" in payload && payload.currency
            ? payload.currency
            : "AED",
        title: "Shop Payment",
        subtitle: "Scanned via QR",
        contextType: "shop",
        contextId: shopSlug,
        metadata: {
          source: "qr_scan",
          qr_type: payload.action,
          shopSlug,
        },
      });
    } catch (e) {
      console.error("[qr-pay-shop]", e);
      toast.error("Failed to open payment");
    } finally {
      setBusy(null);
    }
  }

  // ─────────────────────────────────────
  // CTA selection logic
  // ─────────────────────────────────────
  const userPrimary = useMemo(() => {
    if (!userId) return null;
    if (userId === currentUserId) {
      return { label: "View Profile", icon: <UserPlus className="h-5 w-5" />, onClick: () => navigate(`/u/${userId}`) };
    }
    if (existingThread) {
      return { label: "Continue Chat", icon: <MessageCircle className="h-5 w-5" />, onClick: handleOpenChat };
    }
    if (contactAdded) {
      return { label: "Chat", icon: <MessageCircle className="h-5 w-5" />, onClick: handleOpenChat };
    }
    return { label: "Add Contact", icon: <UserPlus className="h-5 w-5" />, onClick: handleAddContact };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentUserId, existingThread, contactAdded]);

  const shopPrimary = useMemo(() => {
    if (!shopSlug) return null;
    if (followed) {
      return { label: "Open Shop", icon: <ExternalLink className="h-5 w-5" />, onClick: () => navigate(`/s/${shopSlug}`) };
    }
    return { label: "Follow Shop", icon: <Heart className="h-5 w-5" />, onClick: handleFollowShop };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopSlug, followed]);

  // ─────────────────────────────────────
  // USER / CONTACT CARD
  // ─────────────────────────────────────
  if (isUserPayload) {
    return (
      <div className="w-full max-w-[320px] space-y-4 text-center">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <span className="text-2xl font-bold text-primary">
              {displayUserName.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <p className="text-lg font-bold text-foreground">{displayUserName}</p>
          <p className="text-xs text-muted-foreground">
            {payload.action === "add_contact"
              ? "Scanned contact QR"
              : payload.action === "pay_user"
              ? "Scanned payment QR"
              : "Scanned profile QR"}
          </p>
        </div>

        {/* Primary CTA — contextual */}
        {userPrimary && (
          <Button
            className="w-full h-12 text-base gap-2 font-semibold"
            onClick={userPrimary.onClick}
            disabled={busy === "contact" || busy === "chat"}
          >
            {busy === "contact" || busy === "chat" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : contactAdded && !existingThread ? (
              <Check className="h-5 w-5" />
            ) : (
              userPrimary.icon
            )}
            {busy === "contact"
              ? "Adding..."
              : busy === "chat"
              ? "Opening..."
              : userPrimary.label}
          </Button>
        )}

        {/* Secondary CTAs */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleOpenChat}
            disabled={!!busy}
          >
            {busy === "chat" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            {busy === "chat" ? "Opening..." : "Chat"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handlePayUser}
            disabled={!!busy}
          >
            {busy === "pay" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {busy === "pay" ? "Opening..." : "Pay"}
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground gap-1.5">
          <RefreshCcw className="h-3.5 w-3.5" /> Scan again
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────
  // SHOP CARD
  // ─────────────────────────────────────
  if (isShopPayload) {
    return (
      <div className="w-full max-w-[320px] space-y-4 text-center">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
            <Store className="h-7 w-7 text-accent-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground capitalize">{displayShopName}</p>
          <p className="text-xs text-muted-foreground">
            {payload.action === "pay_shop" ? "Scanned shop payment QR" : "Scanned shop QR"}
          </p>
        </div>

        {/* Primary CTA — contextual */}
        {shopPrimary && (
          <Button
            className="w-full h-12 text-base gap-2 font-semibold"
            onClick={shopPrimary.onClick}
            disabled={busy === "follow"}
          >
            {busy === "follow" ? <Loader2 className="h-5 w-5 animate-spin" /> : shopPrimary.icon}
            {busy === "follow" ? "Following..." : shopPrimary.label}
          </Button>
        )}

        {/* Secondary CTAs */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handlePayShop}
            disabled={!!busy}
          >
            {busy === "pay" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {busy === "pay" ? "..." : "Pay"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleFollowShop}
            disabled={!!busy}
          >
            {busy === "follow" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : followed ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Heart className="h-3.5 w-3.5" />
            )}
            {busy === "follow" ? "..." : followed ? "Following" : "Follow"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={handleMessageShop}
            disabled={!!busy}
          >
            {busy === "message" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
            {busy === "message" ? "..." : "Message"}
          </Button>
        </div>

        <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground gap-1.5">
          <RefreshCcw className="h-3.5 w-3.5" /> Scan again
        </Button>
      </div>
    );
  }

  return null;
}
