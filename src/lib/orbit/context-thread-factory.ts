/**
 * Orbit Context Thread Factory — Creates/retrieves contextual threads for any business object.
 * 
 * Every business object (order, rent, payment, travel, service, delivery)
 * generates a dedicated Orbit thread. This is the single entry point.
 */
import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */

/** All business context types that generate Orbit threads */
export type OrbitContextType =
  | "direct"      // User ↔ User
  | "order"       // Marketplace order lifecycle
  | "rent_call"   // Rent payment lifecycle
  | "payment"     // Generic payment / transfer
  | "travel"      // Travel booking lifecycle
  | "service"     // Service booking lifecycle
  | "delivery"    // Delivery mission lifecycle
  | "deal"        // Deal room negotiation
  | "listing"     // Listing inquiry
  | "booking"     // Generic booking
  | "property"    // Tenant ↔ Landlord
  | "team"        // Internal team
  | "support";    // Support ticket

/** Input to create or retrieve a context thread */
export interface ContextThreadRequest {
  contextType: OrbitContextType;
  contextId: string;
  orgId: string;
  initiatorId: string;
  participantIds: string[];
  /** Display label for the thread (e.g. "Order #1234", "Rent Jan 2025") */
  title: string;
  /** Optional subtitle (property name, shop name, etc.) */
  subtitle?: string;
  /** Optional metadata to store on the thread */
  metadata?: Record<string, any>;
}

export interface ContextThreadResult {
  threadId: string;
  contextId: string;
  contextType: OrbitContextType;
  orgId: string;
  isNew: boolean;
}

/** Configuration for each context type */
export interface ContextTypeConfig {
  emoji: string;
  label: string;
  color: string;
  /** Actions available in this thread context */
  availableActions: ThreadActionType[];
  /** Whether Ghost mode is supported */
  ghostSupported: boolean;
  /** Whether wallet integration is active */
  walletEnabled: boolean;
  /** Auto-generated system messages */
  autoSystemMessages: boolean;
}

export type ThreadActionType =
  | "pay"
  | "confirm"
  | "cancel"
  | "sign"
  | "track"
  | "view_receipt"
  | "view_document"
  | "rate"
  | "dispute"
  | "refund"
  | "schedule"
  | "share_location"
  | "call"
  | "video_call";

/* ═══════════════════════════════════════════════════
   CONTEXT TYPE REGISTRY
   ═══════════════════════════════════════════════════ */

export const CONTEXT_TYPE_REGISTRY: Record<OrbitContextType, ContextTypeConfig> = {
  direct: {
    emoji: "💬", label: "Direct Message", color: "accent",
    availableActions: ["pay", "call", "video_call", "share_location"],
    ghostSupported: true, walletEnabled: true, autoSystemMessages: false,
  },
  order: {
    emoji: "📦", label: "Order", color: "violet",
    availableActions: ["pay", "confirm", "cancel", "track", "view_receipt", "rate", "dispute", "refund"],
    ghostSupported: false, walletEnabled: true, autoSystemMessages: true,
  },
  rent_call: {
    emoji: "🏠", label: "Rent", color: "primary",
    availableActions: ["pay", "view_receipt", "view_document", "sign", "dispute"],
    ghostSupported: false, walletEnabled: true, autoSystemMessages: true,
  },
  payment: {
    emoji: "💰", label: "Payment", color: "emerald",
    availableActions: ["pay", "confirm", "view_receipt", "refund"],
    ghostSupported: true, walletEnabled: true, autoSystemMessages: true,
  },
  travel: {
    emoji: "✈️", label: "Travel", color: "sky",
    availableActions: ["pay", "confirm", "cancel", "view_document", "schedule", "share_location"],
    ghostSupported: false, walletEnabled: true, autoSystemMessages: true,
  },
  service: {
    emoji: "🔧", label: "Service", color: "amber",
    availableActions: ["pay", "confirm", "cancel", "schedule", "rate", "share_location"],
    ghostSupported: false, walletEnabled: true, autoSystemMessages: true,
  },
  delivery: {
    emoji: "🚗", label: "Delivery", color: "orange",
    availableActions: ["track", "confirm", "call", "share_location", "dispute", "rate"],
    ghostSupported: false, walletEnabled: true, autoSystemMessages: true,
  },
  deal: {
    emoji: "🤝", label: "Deal", color: "amber",
    availableActions: ["pay", "confirm", "sign", "view_document", "schedule"],
    ghostSupported: false, walletEnabled: true, autoSystemMessages: true,
  },
  listing: {
    emoji: "🏷️", label: "Listing", color: "emerald",
    availableActions: ["pay", "schedule", "call", "share_location"],
    ghostSupported: false, walletEnabled: true, autoSystemMessages: false,
  },
  booking: {
    emoji: "📅", label: "Booking", color: "sky",
    availableActions: ["pay", "confirm", "cancel", "schedule", "view_receipt"],
    ghostSupported: false, walletEnabled: true, autoSystemMessages: true,
  },
  property: {
    emoji: "🏡", label: "Property", color: "primary",
    availableActions: ["pay", "sign", "view_document", "schedule", "call"],
    ghostSupported: false, walletEnabled: true, autoSystemMessages: false,
  },
  team: {
    emoji: "👥", label: "Team", color: "indigo",
    availableActions: ["call", "video_call", "share_location"],
    ghostSupported: false, walletEnabled: false, autoSystemMessages: false,
  },
  support: {
    emoji: "🆘", label: "Support", color: "rose",
    availableActions: ["call"],
    ghostSupported: false, walletEnabled: false, autoSystemMessages: true,
  },
};

/* ═══════════════════════════════════════════════════
   FACTORY
   ═══════════════════════════════════════════════════ */

/**
 * Get or create a context-specific Orbit thread.
 * This is the SINGLE entry point for all business object → thread mapping.
 */
export async function getOrCreateContextThread(
  req: ContextThreadRequest,
): Promise<ContextThreadResult | null> {
  const { contextType, contextId, orgId, initiatorId, participantIds, title, subtitle, metadata } = req;

  const db = supabase as any;

  // 1. Check for existing V2 conversation with this context
  const { data: existing } = await db
    .from("conversations_v2")
    .select("id, metadata, type")
    .contains("metadata", { context_type: contextType, context_id: contextId })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      threadId: existing.id,
      contextId,
      contextType,
      orgId,
      isNew: false,
    };
  }

  // 2. Create new V2 conversation
  try {
    const config = CONTEXT_TYPE_REGISTRY[contextType];
    const participants = participantIds.map(uid => ({
      userId: uid,
      orbitId: null,
      email: null,
      displayName: null,
    }));

    const { data: newConv, error } = await db
      .from("conversations_v2")
      .insert({
        type: contextType === "direct" ? "direct" : "group",
        title,
        participants,
        metadata: {
          context_type: contextType,
          context_id: contextId,
          org_id: orgId,
          subtitle: subtitle || null,
          ...metadata,
        },
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;

    // 3. Auto-seed system message in V2
    if (config.autoSystemMessages) {
      await db.from("chat_messages_v2").insert({
        conversation_id: newConv.id,
        sender_user_id: initiatorId,
        sender_orbit_id: `orbit_${initiatorId.slice(0, 12)}`,
        type: "system",
        body: `${config.emoji} ${config.label} thread created: ${title}`,
        metadata: { context_type: contextType, context_id: contextId },
      });
    }

    return {
      threadId: newConv.id,
      contextId,
      contextType,
      orgId,
      isNew: true,
    };
  } catch (e) {
    console.error("[context-thread-factory] Failed to create thread:", e);
    // Race condition fallback
    const { data: fallback } = await db
      .from("conversations_v2")
      .select("id, metadata, type")
      .contains("metadata", { context_type: contextType, context_id: contextId })
      .limit(1)
      .maybeSingle();

    if (fallback) {
      return {
        threadId: fallback.id,
        contextId,
        contextType,
        orgId,
        isNew: false,
      };
    }
    return null;
  }
}

/**
 * Inject a system action message into a context thread.
 * Used by crons, edge functions, and lifecycle hooks to push
 * structured updates into threads.
 */
export async function injectThreadSystemMessage(opts: {
  threadId: string;
  orgId: string;
  contextType: OrbitContextType;
  contextId: string;
  content: string;
  category?: string;
  /** Optional structured action payload for rendering action cards */
  actionPayload?: ThreadActionPayload;
}) {
  const messageContent = opts.actionPayload
    ? JSON.stringify({ text: opts.content, action: opts.actionPayload })
    : opts.content;

  const db = supabase as any;
  return db.from("chat_messages_v2").insert({
    conversation_id: opts.threadId,
    sender_user_id: "00000000-0000-0000-0000-000000000000",
    sender_orbit_id: "system",
    type: "system",
    body: messageContent,
    metadata: {
      context_type: opts.contextType,
      context_id: opts.contextId,
      category: opts.category || "general",
    },
  });
}

/** Structured action payload embedded in system messages */
export interface ThreadActionPayload {
  type: ThreadActionType;
  label: string;
  /** Route or deep-link for the action */
  route?: string;
  /** Amount for pay actions */
  amount?: number;
  currency?: string;
  /** Entity reference */
  entityId?: string;
  entityType?: string;
  /** Visual variant */
  variant?: "primary" | "secondary" | "destructive" | "success";
  /** Whether action has been completed */
  completed?: boolean;
}

/**
 * Get the config for a context type
 */
export function getContextConfig(contextType: OrbitContextType): ContextTypeConfig {
  return CONTEXT_TYPE_REGISTRY[contextType] || CONTEXT_TYPE_REGISTRY.direct;
}

/**
 * Check if an action is available for a given context type
 */
export function isActionAvailable(contextType: OrbitContextType, action: ThreadActionType): boolean {
  const config = CONTEXT_TYPE_REGISTRY[contextType];
  return config?.availableActions.includes(action) ?? false;
}
