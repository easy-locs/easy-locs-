/**
 * QrResolvedCard — Renders resolved QR payloads using UniversalEntityCard.
 * Preloads relationship state (contact, thread, follow) and delegates CTAs
 * to the Universal Action Engine.
 */
import { useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { fetchProfileName, fetchContactExists, fetchDirectThreads, fetchShopBySlug, fetchShopFollow } from "@/repositories/rental.repository";
import { Button } from "@/components/ui/button";
import UniversalEntityCard from "@/components/actions/UniversalEntityCard";
import type { UniversalQrPayload } from "@/lib/qr-engine";
import type { EntityContext } from "@/lib/action-priority";
import type { UniversalActionType } from "@/lib/action-engine";

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
  const [contactAdded, setContactAdded] = useState(false);
  const [hasThread, setHasThread] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [shopRow, setShopRow] = useState<ShopRow | null>(null);
  const [userLoadedName, setUserLoadedName] = useState<string | null>(null);

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

  const displayUserName = (payload as any)?.name || userLoadedName || "User";
  const displayShopName = shopRow?.name || (shopSlug ? shopSlug.replace(/-/g, " ") : "Shop");

  // ── Preload user relationship state ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!currentUserId || !userId || userId === currentUserId) return;
      try {
        const [profileName, isContact] = await Promise.all([
          fetchProfileName(userId),
          fetchContactExists(currentUserId, userId),
        ]);
        if (cancelled) return;
        if (profileName) setUserLoadedName(profileName);
        setContactAdded(isContact);

        const threadRows = await fetchDirectThreads(100);
        const match = (threadRows || []).find((t: any) =>
          Array.isArray(t.participants) &&
          t.participants.some((p: any) => (p?.userId || p?.user_id || p?.id) === currentUserId) &&
          t.participants.some((p: any) => (p?.userId || p?.user_id || p?.id) === userId)
        );
        if (!cancelled && match) setHasThread(true);
      } catch (err) {
        console.error("[QrResolvedCard] thread lookup error:", err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [currentUserId, userId]);

  // ── Preload shop relationship state ──
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!shopSlug) return;
      try {
        const shop = await fetchShopBySlug(shopSlug);
        if (cancelled) return;
        if (shop) setShopRow(shop as ShopRow);

        if (currentUserId && shop?.id) {
          const isFollowing = await fetchShopFollow(currentUserId, shop.id);
          if (!cancelled) setFollowed(!!follow);
        }
      } catch { /* no-op */ }
    }
    load();
    return () => { cancelled = true; };
  }, [currentUserId, shopSlug]);

  const handleActionComplete = (action: UniversalActionType, ok: boolean) => {
    if (action === "add_contact" && ok) setContactAdded(true);
    if (action === "follow" && ok) setFollowed(true);
  };

  const footer = (
    <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground gap-1.5">
      <RefreshCcw className="h-3.5 w-3.5" /> Scan again
    </Button>
  );

  // ── USER / CONTACT CARD ──
  if (isUserPayload && userId) {
    const ctx: Partial<EntityContext> = {
      isSelf: userId === currentUserId,
      isContact: contactAdded,
      hasThread,
      hasAmount: !!(payload as any).amount,
    };

    return (
      <UniversalEntityCard
        entityType="user"
        entityId={userId}
        title={displayUserName}
        subtitle={
          payload.action === "add_contact"
            ? "Scanned contact QR"
            : payload.action === "pay_user"
            ? "Scanned payment QR"
            : "Scanned profile QR"
        }
        avatar={displayUserName.slice(0, 1).toUpperCase()}
        amount={(payload as any).amount}
        currency={(payload as any).currency}
        recipientId={userId}
        recipientName={displayUserName}
        context={ctx}
        metadata={{ source: "qr_scan", qr_type: payload.action }}
        onActionComplete={handleActionComplete}
        footer={footer}
      />
    );
  }

  // ── SHOP CARD ──
  if (isShopPayload && shopSlug) {
    const ctx: Partial<EntityContext> = {
      isFollowed: followed,
      hasAmount: !!(payload as any).amount,
    };

    return (
      <UniversalEntityCard
        entityType="shop"
        entityId={shopRow?.id}
        slug={shopSlug}
        title={displayShopName}
        subtitle={payload.action === "pay_shop" ? "Scanned shop payment QR" : "Scanned shop QR"}
        amount={(payload as any).amount}
        currency={(payload as any).currency}
        recipientId={shopRow?.user_id}
        recipientName={displayShopName}
        context={ctx}
        metadata={{ source: "qr_scan", qr_type: payload.action, shopSlug }}
        onActionComplete={handleActionComplete}
        footer={footer}
      />
    );
  }

  return null;
}
