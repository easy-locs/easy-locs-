/**
 * UNIVERSAL ROOT FORMULA — Domain Registry
 * 
 * Every domain follows: INTENT → ENTRY → PIPELINE → NORMALIZER → OWNER → STATE → SELECTOR → VIEW → OUTPUT
 * 
 * This registry maps all official domain entries for audit and enforcement.
 */

export interface DomainEntry {
  domain: string;
  intent: string;
  entry: string;
  pipeline: string;
  owner: string;
  selector: string;
}

export const UNIVERSAL_DOMAIN_REGISTRY: DomainEntry[] = [
  // ── Orbit Messages ──
  { domain: "orbit", intent: "send_text", entry: "orbitDispatch", pipeline: "sendTextPipeline", owner: "orbitStore.messages", selector: "selectConversationMessages" },
  { domain: "orbit", intent: "send_media", entry: "orbitDispatch", pipeline: "sendMediaPipeline", owner: "orbitStore.attachments", selector: "selectAttachmentsForMessage" },
  { domain: "orbit", intent: "send_voice", entry: "orbitDispatch", pipeline: "sendVoicePipeline", owner: "orbitStore.messages", selector: "selectConversationMessages" },
  { domain: "orbit", intent: "send_location", entry: "orbitDispatch", pipeline: "sendLocationPipeline", owner: "orbitStore.messages", selector: "selectConversationMessages" },
  { domain: "orbit", intent: "edit_message", entry: "orbitDispatch", pipeline: "editMessagePipeline", owner: "orbitStore.messages", selector: "selectConversationMessages" },
  { domain: "orbit", intent: "mark_read", entry: "orbitDispatch", pipeline: "markReadPipeline", owner: "orbitStore.receipts", selector: "selectUnreadCount" },

  // ── Orbit Calls ──
  { domain: "orbit", intent: "start_call", entry: "orbitDispatch", pipeline: "callStartPipeline", owner: "callStore.sessions", selector: "selectActiveCall" },
  { domain: "orbit", intent: "accept_call", entry: "orbitDispatch", pipeline: "callAcceptPipeline", owner: "callStore.sessions", selector: "selectActiveCall" },
  { domain: "orbit", intent: "decline_call", entry: "orbitDispatch", pipeline: "callDeclinePipeline", owner: "callStore.sessions", selector: "selectActiveCall" },
  { domain: "orbit", intent: "end_call", entry: "orbitDispatch", pipeline: "callEndPipeline", owner: "callStore.sessions", selector: "selectActiveCall" },

  // ── Cards ──
  { domain: "cards", intent: "load_entity", entry: "cardDispatch", pipeline: "cardBuildPipeline", owner: "cardStore.entities", selector: "selectCardModel" },
  { domain: "cards", intent: "load_batch", entry: "cardDispatch", pipeline: "cardBatchPipeline", owner: "cardStore.entities", selector: "selectCardsByCategory" },

  // ── I18N ──
  { domain: "i18n", intent: "change_locale", entry: "i18nDispatch", pipeline: "localeSwitchPipeline", owner: "i18nStore.locale", selector: "selectTranslation" },
  { domain: "i18n", intent: "load_dictionary", entry: "i18nDispatch", pipeline: "loadDictionaryPipeline", owner: "i18nStore.dictionaries", selector: "selectTranslation" },

  // ── SEO ──
  { domain: "seo", intent: "render_page", entry: "seoDispatch", pipeline: "seoMetaPipeline", owner: "seoStore.currentPageMeta", selector: "selectSeoMeta" },

  // ── Map ──
  { domain: "map", intent: "update_viewport", entry: "mapDispatch", pipeline: "mapViewportPipeline", owner: "superMapStore.viewport", selector: "selectMapViewport" },
  { domain: "map", intent: "select_entity", entry: "mapDispatch", pipeline: "mapSelectPipeline", owner: "superMapStore.selectedEntityId", selector: "selectVisiblePins" },
  { domain: "map", intent: "toggle_layer", entry: "mapDispatch", pipeline: "mapLayerPipeline", owner: "superMapStore.layers", selector: "selectVisiblePins" },

  // ── Radar ──
  { domain: "radar", intent: "refresh_feed", entry: "radarDispatch", pipeline: "radarFeedPipeline", owner: "radarStore.feeds", selector: "selectRadarFeed" },
  { domain: "radar", intent: "set_category", entry: "radarDispatch", pipeline: "radarFilterPipeline", owner: "radarStore.category", selector: "selectRadarCategory" },
  { domain: "radar", intent: "set_location", entry: "radarDispatch", pipeline: "radarLocationPipeline", owner: "radarStore.userLocation", selector: "selectRadarFeed" },
];

/**
 * Validate: every domain has exactly 1 entry per intent.
 */
export function validateUniversalFormula(): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const seen = new Map<string, string>();

  for (const entry of UNIVERSAL_DOMAIN_REGISTRY) {
    const key = `${entry.domain}.${entry.intent}`;
    if (seen.has(key)) {
      violations.push(`DUPLICATE ENTRY: ${key} registered in both ${seen.get(key)} and ${entry.entry}`);
    }
    seen.set(key, entry.entry);
  }

  return { valid: violations.length === 0, violations };
}
