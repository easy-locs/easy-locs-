/**
 * Communication Hub — Unified types for the central communication brain.
 * Supports 7 conversation types: direct, business, listing, booking, deal, property, team
 */

/** All conversation categories in the platform */
export type ConversationType =
  | "direct"     // User ↔ User (WhatsApp-like)
  | "business"   // Client ↔ Service provider
  | "listing"    // User ↔ Listing owner (marketplace)
  | "booking"    // Booking-linked conversation
  | "deal"       // Deal room negotiation
  | "property"   // Tenant ↔ Landlord
  | "team";      // Internal team chat

/** Source module for badge display */
export type SourceModule =
  | "long_term"
  | "seasonal"
  | "marketplace"
  | "concierge"
  | "real_estate"
  | "direct"
  | "team";

/** Unified conversation thread */
export interface ConversationThread {
  id: string;
  conversationType: ConversationType;
  sourceModule: SourceModule;
  contextType: string;
  contextId: string;

  // Display
  name: string;
  email: string | null;
  phone?: string | null;
  avatarUrl?: string | null;

  // Context references
  bookingId?: string;
  bookingType?: string;
  bookingStatus?: string;
  propertyLabel?: string;
  propertyCountry?: string;
  propertyId?: string;
  serviceTitle?: string;
  listingTitle?: string;
  listingType?: string;
  totalPrice?: number;
  currency?: string;
  tenantId?: string;
  leadId?: string;
  threadId?: string;
  dealId?: string;
  assignedTo?: string;

  // State
  unreadCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
  conversationStatus?: string;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  clearedAt?: string;
}

/** Chat message */
export interface ChatMessage {
  id: string;
  sender_id: string;
  tenant_id: string | null;
  content: string;
  translated_content: string | null;
  translated_locale: string | null;
  language_detected: string | null;
  category: string;
  read: boolean;
  created_at: string;
  attachment_url?: string;
  message_type?: string;
  property_id?: string;
  delivered?: boolean;
  conversation_status?: string;
  booking_id?: string;
  booking_type?: string;
  contact_name?: string;
  contact_email?: string;
  sender_locale?: string;
  context_type?: string;
  context_id?: string;
  thread_id?: string;
  guest_session_id?: string;
}

/** Message categories */
export const MESSAGE_CATEGORIES = [
  { value: "general", label: "💬 General", icon: "💬" },
  { value: "payment", label: "💰 Payment", icon: "💰" },
  { value: "booking", label: "📅 Booking", icon: "📅" },
  { value: "lease", label: "📝 Lease", icon: "📝" },
  { value: "maintenance", label: "🔧 Maintenance", icon: "🔧" },
  { value: "legal", label: "⚖️ Legal", icon: "⚖️" },
  { value: "real_estate", label: "🏠 Real Estate", icon: "🏠" },
];

/** Conversation status options */
export const CONV_STATUSES = [
  { value: "active", label: "Active", icon: "🟢" },
  { value: "waiting_tenant", label: "Waiting client", icon: "🟡" },
  { value: "waiting_landlord", label: "Waiting owner", icon: "🟠" },
  { value: "waiting_payment", label: "Waiting payment", icon: "💰" },
  { value: "resolved", label: "Resolved", icon: "✅" },
  { value: "archived", label: "Archived", icon: "📦" },
];

/** Conversation type configuration for display */
export const CONV_TYPE_CONFIG: Record<ConversationType, { emoji: string; label: string; color: string; border: string; bg: string; text: string }> = {
  direct:   { emoji: "💬", label: "Direct",   color: "text-accent",       border: "border-accent/20",       bg: "bg-accent/10",       text: "text-accent" },
  business: { emoji: "🏢", label: "Business", color: "text-violet-600",   border: "border-violet-500/20",   bg: "bg-violet-500/10",   text: "text-violet-600" },
  listing:  { emoji: "🏷️", label: "Listing",  color: "text-emerald-600",  border: "border-emerald-500/20",  bg: "bg-emerald-500/10",  text: "text-emerald-600" },
  booking:  { emoji: "📅", label: "Booking",  color: "text-sky-600",      border: "border-sky-500/20",      bg: "bg-sky-500/10",      text: "text-sky-600" },
  deal:     { emoji: "🤝", label: "Deal",     color: "text-amber-600",    border: "border-amber-500/20",    bg: "bg-amber-500/10",    text: "text-amber-600" },
  property: { emoji: "🏠", label: "Property", color: "text-primary",      border: "border-primary/20",      bg: "bg-primary/10",      text: "text-primary" },
  team:     { emoji: "👥", label: "Team",     color: "text-indigo-600",   border: "border-indigo-500/20",   bg: "bg-indigo-500/10",   text: "text-indigo-600" },
};

/** Source module badge configuration */
export const SOURCE_MODULE_CONFIG: Record<SourceModule, { emoji: string; label: string; cls: string }> = {
  long_term:    { emoji: "🏠", label: "Long-term",    cls: "bg-primary/10 text-primary border-primary/20" },
  seasonal:     { emoji: "🏖️", label: "Seasonal",     cls: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  marketplace:  { emoji: "🛍️", label: "Marketplace",  cls: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
  concierge:    { emoji: "🎯", label: "Concierge",    cls: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  real_estate:  { emoji: "🏡", label: "Real Estate",  cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  direct:       { emoji: "💬", label: "Direct",       cls: "bg-accent/10 text-accent border-accent/20" },
  team:         { emoji: "👥", label: "Team",         cls: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
};

/** Status badge colors */
export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  awaiting_payment: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  new: "bg-primary/10 text-primary border-primary/20",
  inquiry: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  negotiation: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  offer_sent: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  counter_offer: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  accepted: "bg-green-500/10 text-green-600 border-green-500/20",
  payment_pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Pending",
  confirmed: "✅ Confirmed",
  completed: "🏁 Completed",
  cancelled: "❌ Cancelled",
  awaiting_payment: "💰 Awaiting Payment",
  paid: "💚 Paid",
  new: "🆕 New",
  inquiry: "💬 Inquiry",
  negotiation: "🔄 Negotiation",
  offer_sent: "📤 Offer Sent",
  counter_offer: "↩️ Counter Offer",
  accepted: "✅ Accepted",
  payment_pending: "⏳ Payment Pending",
};

/** Filter tabs for conversation list */
export const CONVERSATION_FILTERS = [
  { value: "all", label: "All", emoji: "" },
  { value: "direct", label: "Direct", emoji: "💬" },
  { value: "property", label: "Property", emoji: "🏠" },
  { value: "booking", label: "Bookings", emoji: "📅" },
  { value: "listing", label: "Listings", emoji: "🏷️" },
  { value: "deal", label: "Deals", emoji: "🤝" },
  { value: "business", label: "Business", emoji: "🏢" },
] as const;
