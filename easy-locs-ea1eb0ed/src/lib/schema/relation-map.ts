export interface SchemaRelation {
  from: string;
  to: string;
  type: "belongs_to" | "has_many" | "has_one" | "many_to_many";
  foreign_key: string;
  description: string;
}

export const CANONICAL_RELATION_MAP: SchemaRelation[] = [
  { from: "identity", to: "organization", type: "has_many", foreign_key: "owner_user_id", description: "User owns organizations" },
  { from: "organization", to: "address", type: "has_one", foreign_key: "address_id", description: "Organization has a physical address" },
  { from: "identity", to: "wallet_account", type: "has_one", foreign_key: "owner_user_id", description: "User has one wallet" },
  { from: "identity", to: "seller_profile", type: "has_one", foreign_key: "user_id", description: "User has seller profile" },
  { from: "identity", to: "service_profile", type: "has_one", foreign_key: "user_id", description: "User has service profile" },
  { from: "identity", to: "contact", type: "has_many", foreign_key: "owner_user_id", description: "User has contacts" },
  { from: "identity", to: "device_session", type: "has_many", foreign_key: "user_id", description: "User has device sessions" },
  { from: "identity", to: "consent", type: "has_many", foreign_key: "user_id", description: "User has consents" },
  { from: "identity", to: "notification", type: "has_many", foreign_key: "recipient_id", description: "User receives notifications" },

  { from: "listing", to: "taxonomy", type: "belongs_to", foreign_key: "taxonomy_id", description: "Listing classified by taxonomy" },
  { from: "listing", to: "address", type: "belongs_to", foreign_key: "address_id", description: "Listing at a location" },
  { from: "listing", to: "media", type: "has_many", foreign_key: "owner_id (owner_type=listing)", description: "Listing has media" },
  { from: "listing", to: "listing_detail", type: "has_one", foreign_key: "listing_id", description: "Listing has extended details" },
  { from: "listing", to: "listing_attribute", type: "has_many", foreign_key: "listing_id", description: "Listing has filterable attributes" },
  { from: "listing", to: "availability", type: "has_many", foreign_key: "owner_id (owner_type=listing)", description: "Listing has availability slots" },
  { from: "listing", to: "identity", type: "belongs_to", foreign_key: "seller_id", description: "Listing owned by seller" },
  { from: "listing", to: "organization", type: "belongs_to", foreign_key: "org_id", description: "Listing belongs to organization" },

  { from: "cart", to: "cart_item", type: "has_many", foreign_key: "cart_id", description: "Cart contains items" },
  { from: "cart_item", to: "listing", type: "belongs_to", foreign_key: "listing_id", description: "Cart item references listing" },

  { from: "transaction", to: "listing", type: "belongs_to", foreign_key: "listing_id", description: "Transaction references listing" },
  { from: "transaction", to: "payment", type: "has_many", foreign_key: "transaction_id", description: "Transaction has payments" },
  { from: "transaction", to: "receipt", type: "has_one", foreign_key: "transaction_id", description: "Transaction generates receipt" },
  { from: "transaction", to: "identity", type: "belongs_to", foreign_key: "buyer_id", description: "Transaction has buyer" },
  { from: "transaction", to: "identity", type: "belongs_to", foreign_key: "seller_id", description: "Transaction has seller" },
  { from: "transaction", to: "proof_record", type: "has_many", foreign_key: "reference_id (reference_type=transaction)", description: "Transaction has proof records" },

  { from: "payment", to: "wallet_account", type: "belongs_to", foreign_key: "wallet_account_id", description: "Payment from wallet" },
  { from: "wallet_account", to: "ledger_entry", type: "has_many", foreign_key: "wallet_account_id", description: "Wallet has ledger entries" },

  { from: "conversation", to: "participant", type: "has_many", foreign_key: "conversation_id", description: "Conversation has participants" },
  { from: "conversation", to: "message", type: "has_many", foreign_key: "conversation_id", description: "Conversation has messages" },
  { from: "conversation", to: "call_session", type: "has_many", foreign_key: "conversation_id", description: "Conversation can have calls" },
  { from: "participant", to: "identity", type: "belongs_to", foreign_key: "user_id", description: "Participant is a user" },
  { from: "message", to: "media", type: "has_many", foreign_key: "media_group_id", description: "Message can have media attachments" },
  { from: "contact", to: "identity", type: "belongs_to", foreign_key: "target_user_id", description: "Contact points to user" },

  { from: "menu", to: "listing", type: "belongs_to", foreign_key: "listing_id", description: "Menu belongs to restaurant listing" },
  { from: "menu", to: "menu_section", type: "has_many", foreign_key: "menu_id", description: "Menu has sections" },
  { from: "menu_section", to: "menu_item", type: "has_many", foreign_key: "section_id", description: "Section has items" },
  { from: "menu_item", to: "modifier_group", type: "has_many", foreign_key: "item_id", description: "Item has modifier groups" },
  { from: "modifier_group", to: "modifier_option", type: "has_many", foreign_key: "group_id", description: "Group has options" },

  { from: "property", to: "room_type", type: "has_many", foreign_key: "property_id", description: "Property has room types" },
  { from: "room_type", to: "rate_plan", type: "has_many", foreign_key: "room_type_id", description: "Room type has rate plans" },
  { from: "property", to: "unit", type: "has_many", foreign_key: "property_id", description: "Property has units" },
  { from: "unit", to: "lease", type: "has_many", foreign_key: "unit_id", description: "Unit has leases" },
  { from: "unit", to: "maintenance_ticket", type: "has_many", foreign_key: "unit_id", description: "Unit has maintenance tickets" },

  { from: "service_profile", to: "service_package", type: "has_many", foreign_key: "service_profile_id", description: "Provider offers packages" },
  { from: "service_profile", to: "service_slot", type: "has_many", foreign_key: "service_profile_id", description: "Provider has availability slots" },

  { from: "activity", to: "event_schedule", type: "has_many", foreign_key: "activity_id", description: "Activity has schedules" },
  { from: "activity", to: "ticket_type", type: "has_many", foreign_key: "activity_id", description: "Activity has ticket types" },
  { from: "activity", to: "venue", type: "belongs_to", foreign_key: "venue_id", description: "Activity at venue" },

  { from: "page_config", to: "section_config", type: "has_many", foreign_key: "page_config_id", description: "Page has sections" },
  { from: "banner", to: "campaign", type: "belongs_to", foreign_key: "campaign_id", description: "Banner in campaign" },
  { from: "banner", to: "media", type: "belongs_to", foreign_key: "media_id", description: "Banner has media" },

  { from: "onboarding_session", to: "identity", type: "belongs_to", foreign_key: "actor_id", description: "Onboarding by user" },
  { from: "import_job", to: "staging_entity", type: "has_many", foreign_key: "import_job_id", description: "Import has staging entities" },

  { from: "support_ticket", to: "identity", type: "belongs_to", foreign_key: "creator_id", description: "Ticket opened by user" },
  { from: "engine_registry", to: "engine_run_log", type: "has_many", foreign_key: "engine_id", description: "Engine has run logs" },
  { from: "engine_registry", to: "repair_record", type: "has_many", foreign_key: "source_engine_id", description: "Engine produces repairs" },
  { from: "engine_registry", to: "learning_memory", type: "has_many", foreign_key: "engine_id", description: "Engine has learning memories" },
  { from: "repair_record", to: "proof_record", type: "belongs_to", foreign_key: "proof_id", description: "Repair backed by proof" },
];

export function getRelationsFor(schemaName: string): SchemaRelation[] {
  return CANONICAL_RELATION_MAP.filter(
    (r) => r.from === schemaName || r.to === schemaName
  );
}

export function getRelationGraph(): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const rel of CANONICAL_RELATION_MAP) {
    if (!graph.has(rel.from)) graph.set(rel.from, new Set());
    if (!graph.has(rel.to)) graph.set(rel.to, new Set());
    graph.get(rel.from)!.add(rel.to);
    graph.get(rel.to)!.add(rel.from);
  }
  return graph;
}
