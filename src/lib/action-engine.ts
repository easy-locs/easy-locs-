/**
 * Universal Action Engine — Single source of truth for all entity actions.
 * Every CTA across QR, Map, Wallet, Shops, Products, and Chat routes through here.
 */
import type { NavigateFunction } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateDirectThread } from "@/lib/direct-thread";

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

export type UniversalEntityType =
  | "user"
  | "shop"
  | "product"
  | "payment_request"
  | "chat_thread"
  | "map_pin"
  | "live"
  | "service";

export type UniversalActionType =
  | "open"
  | "chat"
  | "pay"
  | "request"
  | "follow"
  | "add_contact"
  | "scan"
  | "navigate";

export type UniversalActionInput = {
  entityType: UniversalEntityType;
  action: UniversalActionType;
  entityId?: string | null;
  slug?: string | null;
  amount?: number | null;
  currency?: string | null;
  title?: string | null;
  subtitle?: string | null;
  recipientId?: string | null;
  recipientName?: string | null;
  metadata?: Record<string, any>;
};

export type ActionResult = {
  ok: boolean;
  error?: string;
  data?: any;
};

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

export type ActionEngineDeps = {
  navigate: NavigateFunction;
  openPayment: OpenPaymentFn;
  currentUserId?: string;
  currentOrgId?: string | null;
};

/* ═══════════════════════════════════════════════════
   MAIN EXECUTOR
   ═══════════════════════════════════════════════════ */

export async function executeUniversalAction(
  input: UniversalActionInput,
  deps: ActionEngineDeps,
): Promise<ActionResult> {
  const { navigate, openPayment, currentUserId, currentOrgId } = deps;

  try {
    switch (input.action) {
      /* ── OPEN ── */
      case "open":
        return handleOpen(input, navigate);

      /* ── CHAT ── */
      case "chat":
        return await handleChat(input, navigate, currentUserId);

      /* ── PAY ── */
      case "pay":
        return await handlePay(input, openPayment);

      /* ── REQUEST ── */
      case "request":
        navigate("/dashboard/wallet?action=request");
        return { ok: true };

      /* ── FOLLOW ── */
      case "follow":
        return await handleFollow(input, currentUserId);

      /* ── ADD CONTACT ── */
      case "add_contact":
        return await handleAddContact(input, currentUserId, currentOrgId);

      /* ── SCAN ── */
      case "scan":
        navigate("/pay/scan");
        return { ok: true };

      /* ── NAVIGATE ── */
      case "navigate": {
        const path = input.metadata?.path as string;
        if (path) navigate(path);
        return { ok: !!path };
      }

      default:
        return { ok: false, error: "Unknown action" };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Action failed";
    console.error("[action-engine]", msg, err);
    toast.error(msg);
    return { ok: false, error: msg };
  }
}

/* ═══════════════════════════════════════════════════
   ACTION HANDLERS
   ═══════════════════════════════════════════════════ */

function handleOpen(input: UniversalActionInput, navigate: NavigateFunction): ActionResult {
  const { entityType, entityId, slug } = input;

  switch (entityType) {
    case "user":
      if (entityId) navigate(`/u/${entityId}`);
      return { ok: !!entityId };
    case "shop":
      if (slug) navigate(`/s/${slug}`);
      else if (entityId) navigate(`/s/${entityId}`);
      return { ok: !!(slug || entityId) };
    case "product":
      if (entityId) navigate(`/p/${entityId}`);
      return { ok: !!entityId };
    case "payment_request":
      if (entityId) navigate(`/pay/request/${entityId}`);
      return { ok: !!entityId };
    case "live":
      if (entityId) navigate(`/live/${entityId}`);
      return { ok: !!entityId };
    case "service":
      if (slug) navigate(`/book/${slug}`);
      return { ok: !!slug };
    case "chat_thread":
      if (entityId) navigate(`/client/messages?thread=${entityId}`);
      return { ok: !!entityId };
    case "map_pin":
      if (slug) navigate(`/s/${slug}`);
      return { ok: !!slug };
    default:
      return { ok: false, error: "Cannot open this entity" };
  }
}

async function handleChat(
  input: UniversalActionInput,
  navigate: NavigateFunction,
  currentUserId?: string,
): Promise<ActionResult> {
  if (!currentUserId) {
    toast.error("Please sign in first");
    return { ok: false, error: "Not authenticated" };
  }

  let targetUserId = input.recipientId || input.entityId;
  let targetName = input.recipientName || input.title || "User";

  // For shops, resolve owner
  if (input.entityType === "shop" && !targetUserId && input.slug) {
    const { data: shop } = await supabase
      .from("storefront_pages")
      .select("user_id, name")
      .eq("slug", input.slug)
      .maybeSingle();
    targetUserId = shop?.user_id;
    if (!targetName || targetName === "User") targetName = shop?.name || "Shop";
  }

  if (!targetUserId) {
    toast.error("Cannot find recipient");
    return { ok: false, error: "No recipient" };
  }

  const thread = await getOrCreateDirectThread({
    currentUserId,
    targetUserId,
    targetName: targetName || "User",
  });

  if (thread) {
    navigate(`/client/messages?thread=${thread.contextId}`);
    return { ok: true, data: thread };
  }

  toast.error("Could not open conversation");
  return { ok: false, error: "Thread creation failed" };
}

async function handlePay(
  input: UniversalActionInput,
  openPayment: OpenPaymentFn,
): Promise<ActionResult> {
  let recipientId = input.recipientId || undefined;

  // For shops, resolve owner if not already provided
  if (input.entityType === "shop" && !recipientId && input.slug) {
    const { data: shop } = await supabase
      .from("storefront_pages")
      .select("user_id")
      .eq("slug", input.slug)
      .maybeSingle();
    recipientId = shop?.user_id || undefined;
  }

  if (input.entityType === "user" && !recipientId) {
    recipientId = input.entityId || undefined;
  }

  if (!recipientId) {
    toast.error("Recipient not found");
    return { ok: false, error: "No recipient" };
  }

  const result = await openPayment({
    amount: input.amount || 0,
    currency: input.currency || "AED",
    title: input.title ? `Pay ${input.title}` : "Payment",
    subtitle: input.subtitle || undefined,
    recipientId,
    recipientName: input.recipientName || input.title || undefined,
    contextType: input.entityType === "shop" ? "shop" : "generic",
    contextId: input.entityId || input.slug || null,
    metadata: {
      source: input.metadata?.source || "action_engine",
      entityType: input.entityType,
      ...(input.metadata || {}),
    },
  });

  return {
    ok: result.ok,
    error: result.error,
    data: { transactionId: result.transactionId },
  };
}

async function handleFollow(
  input: UniversalActionInput,
  currentUserId?: string,
): Promise<ActionResult> {
  if (!currentUserId) {
    toast.error("Please sign in first");
    return { ok: false, error: "Not authenticated" };
  }

  const shopId = input.entityId;
  if (!shopId) {
    toast.error("Shop not found");
    return { ok: false, error: "No shop ID" };
  }

  const { error } = await supabase.from("shop_follows").insert({
    user_id: currentUserId,
    shop_id: shopId,
  } as any);

  if (error) {
    if ((error as any).code === "23505") {
      toast.info("Already following");
      return { ok: true };
    }
    throw error;
  }

  toast.success("Shop followed!");
  return { ok: true };
}

async function handleAddContact(
  input: UniversalActionInput,
  currentUserId?: string,
  currentOrgId?: string | null,
): Promise<ActionResult> {
  if (!currentUserId) {
    toast.error("Please sign in first");
    return { ok: false, error: "Not authenticated" };
  }

  const targetId = input.recipientId || input.entityId;
  if (!targetId) {
    toast.error("User not found");
    return { ok: false, error: "No target ID" };
  }

  if (targetId === currentUserId) {
    toast.info("This is your own profile");
    return { ok: true };
  }

  // Get profile name
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email")
    .eq("id", targetId)
    .maybeSingle();

  const { error } = await supabase.from("contacts").insert({
    owner_id: currentUserId,
    org_id: currentOrgId || null,
    name: profile?.name || input.title || "Unknown",
    email: profile?.email || null,
    contact_user_id: targetId,
    category: "professional",
  } as any);

  if (error) {
    if ((error as any).code === "23505") {
      toast.info("Already in your contacts");
      return { ok: true };
    }
    throw error;
  }

  toast.success("Contact added");
  return { ok: true };
}
