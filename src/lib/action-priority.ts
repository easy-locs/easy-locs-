/**
 * Action Priority Engine — Determines the best primary CTA for any entity context.
 * Returns the smartest CTA based on relationship state, payload data, and entity type.
 */
import type { UniversalEntityType, UniversalActionType } from "./action-engine";

export type EntityContext = {
  entityType: UniversalEntityType;
  /** Is this the current user's own entity? */
  isSelf?: boolean;
  /** Does a chat thread already exist? */
  hasThread?: boolean;
  /** Is this user already a contact? */
  isContact?: boolean;
  /** Is this shop already followed? */
  isFollowed?: boolean;
  /** Does the payload carry an amount? */
  hasAmount?: boolean;
  /** Is the payment request already paid? */
  isPaid?: boolean;
  /** Is the product purchasable (has price)? */
  isPurchasable?: boolean;
};

export type PrimaryCTA = {
  action: UniversalActionType;
  label: string;
  /** Icon name hint for consuming component */
  icon: "open" | "chat" | "pay" | "follow" | "add_contact" | "request" | "scan";
};

/**
 * Returns the recommended primary CTA for a given entity + context.
 */
export function getPrimaryActionForEntity(ctx: EntityContext): PrimaryCTA {
  switch (ctx.entityType) {
    case "user":
      if (ctx.isSelf) return { action: "open", label: "View Profile", icon: "open" };
      if (ctx.hasAmount) return { action: "pay", label: "Pay", icon: "pay" };
      if (ctx.hasThread) return { action: "chat", label: "Continue Chat", icon: "chat" };
      if (ctx.isContact) return { action: "chat", label: "Chat", icon: "chat" };
      return { action: "add_contact", label: "Add Contact", icon: "add_contact" };

    case "shop":
      if (ctx.hasAmount) return { action: "pay", label: "Pay", icon: "pay" };
      if (ctx.isFollowed) return { action: "open", label: "Open Shop", icon: "open" };
      return { action: "follow", label: "Follow Shop", icon: "follow" };

    case "product":
      if (ctx.isPurchasable) return { action: "pay", label: "Buy", icon: "pay" };
      return { action: "open", label: "View Product", icon: "open" };

    case "payment_request":
      if (ctx.isPaid) return { action: "open", label: "View Receipt", icon: "open" };
      return { action: "pay", label: "Pay Now", icon: "pay" };

    case "map_pin":
      if (ctx.hasAmount) return { action: "pay", label: "Pay", icon: "pay" };
      return { action: "open", label: "Open", icon: "open" };

    case "live":
      return { action: "open", label: "Join Live", icon: "open" };

    case "service":
      return { action: "open", label: "Book", icon: "open" };

    case "chat_thread":
      return { action: "chat", label: "Open Chat", icon: "chat" };

    default:
      return { action: "open", label: "Open", icon: "open" };
  }
}

/**
 * Returns secondary CTAs (everything relevant except the primary).
 */
export function getSecondaryActions(ctx: EntityContext, primary: PrimaryCTA): PrimaryCTA[] {
  const all: PrimaryCTA[] = [];

  if (ctx.entityType === "user") {
    if (primary.action !== "chat") all.push({ action: "chat", label: "Chat", icon: "chat" });
    if (primary.action !== "pay") all.push({ action: "pay", label: "Pay", icon: "pay" });
    if (primary.action !== "open") all.push({ action: "open", label: "Profile", icon: "open" });
  }

  if (ctx.entityType === "shop") {
    if (primary.action !== "open") all.push({ action: "open", label: "Open", icon: "open" });
    if (primary.action !== "pay") all.push({ action: "pay", label: "Pay", icon: "pay" });
    if (primary.action !== "chat") all.push({ action: "chat", label: "Message", icon: "chat" });
    if (primary.action !== "follow" && !ctx.isFollowed) all.push({ action: "follow", label: "Follow", icon: "follow" });
  }

  if (ctx.entityType === "product") {
    if (primary.action !== "open") all.push({ action: "open", label: "Details", icon: "open" });
    if (primary.action !== "chat") all.push({ action: "chat", label: "Message Seller", icon: "chat" });
  }

  if (ctx.entityType === "map_pin") {
    if (primary.action !== "open") all.push({ action: "open", label: "Open", icon: "open" });
    if (primary.action !== "pay") all.push({ action: "pay", label: "Pay", icon: "pay" });
    if (primary.action !== "chat") all.push({ action: "chat", label: "Message", icon: "chat" });
  }

  return all;
}
