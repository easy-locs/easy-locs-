/**
 * RINK Scanner Rules — Comprehensive audit rules for 0-conflict enforcement.
 *
 * Categories: VISUAL, QR, CALL, MESSAGE_STATUS, RETRY, RECEIPT, GLOBAL
 *
 * Usage: Import rules and iterate to check codebase health.
 */

export type RinkSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface RinkRule {
  id: string;
  category: string;
  severity: RinkSeverity;
  description: string;
  pattern: RegExp;
  excludePatterns?: RegExp[];
  fix: string;
}

export const RINK_RULES: RinkRule[] = [
  // ══════════════════════════════════════════════
  // VISUAL
  // ══════════════════════════════════════════════
  {
    id: "DUPLICATE_CARD_SHELL",
    category: "VISUAL",
    severity: "HIGH",
    description: "Multiple CardShell implementations detected",
    pattern: /export\s+(function|const)\s+\w*Card\w*Shell/,
    excludePatterns: [/CardShell\.tsx$/],
    fix: "Use the canonical CardShell from src/components/shells/CardShell",
  },
  {
    id: "DUPLICATE_BADGE_SYSTEM",
    category: "VISUAL",
    severity: "HIGH",
    description: "Multiple badge rendering systems",
    pattern: /className=.*badge.*(?:bg-|text-|rounded-full)/,
    excludePatterns: [/Badge\.tsx$/, /badge\.tsx$/],
    fix: "Use canonical Badge component",
  },
  {
    id: "DUPLICATE_STATUS_RENDERER",
    category: "VISUAL",
    severity: "HIGH",
    description: "Status display logic outside MessageStatusBadge",
    pattern: /<Check(?:Check)?\s.*className/,
    excludePatterns: [/MessageStatusBadge\.tsx$/],
    fix: "Use MessageStatusBadge for all delivery status rendering",
  },
  {
    id: "INLINE_CARD_LOGIC",
    category: "VISUAL",
    severity: "HIGH",
    description: "Business logic computed inline in card components",
    pattern: /(?:distance|rating|score)\s*[=:]\s*(?:Math\.|parseFloat|Number)/,
    excludePatterns: [/pipeline|selector|viewmodel|store/i],
    fix: "Move calculations to cardViewModel or cardPipeline",
  },
  {
    id: "INLINE_DISTANCE_RATING",
    category: "VISUAL",
    severity: "MEDIUM",
    description: "Distance or rating formatting inline in components",
    pattern: /\.toFixed\(\d\).*(?:km|mi|star|rating)/i,
    excludePatterns: [/format|helper|util|pipeline/i],
    fix: "Use canonical formatDistance/formatRating helpers",
  },
  {
    id: "DIRECT_CARD_ACTION_WRITE",
    category: "VISUAL",
    severity: "HIGH",
    description: "Card action writes directly to DB without dispatch",
    pattern: /supabase\s*\.from\(.*\)\s*\.(?:insert|update|delete).*(?:card|entity|shop)/i,
    excludePatterns: [/repository|repo|pipeline|service/i],
    fix: "Route card actions through cardDispatch",
  },
  {
    id: "MULTIPLE_OVERLAY_OWNERS",
    category: "VISUAL",
    severity: "HIGH",
    description: "Multiple components managing overlay visibility state",
    pattern: /set(?:Show|Open|Visible)(?:Overlay|Modal|Sheet)/,
    excludePatterns: [/store|provider/i],
    fix: "Centralize overlay state in uiStore.overlays",
  },
  {
    id: "DUPLICATE_LOADER_SYSTEM",
    category: "VISUAL",
    severity: "MEDIUM",
    description: "Multiple loading indicator implementations",
    pattern: /(?:isLoading|loading)\s*&&\s*<(?:div|span).*(?:animate-spin|Loader)/,
    excludePatterns: [/Loader\.tsx$/, /Spinner\.tsx$/],
    fix: "Use canonical Loader/Spinner component",
  },

  // ══════════════════════════════════════════════
  // QR
  // ══════════════════════════════════════════════
  {
    id: "QR_DIRECT_NAVIGATION",
    category: "QR",
    severity: "HIGH",
    description: "QR scanner navigates directly instead of through qrDispatch",
    pattern: /(?:navigate|push|replace)\s*\(.*(?:qr|scan)/i,
    excludePatterns: [/qr-dispatch|qrDispatch/i],
    fix: "Route QR actions through qrDispatch → qrPipeline",
  },
  {
    id: "QR_DIRECT_WRITE",
    category: "QR",
    severity: "HIGH",
    description: "QR component writes directly to database",
    pattern: /supabase.*\.from\(.*\).*(?:insert|update).*qr/i,
    excludePatterns: [/repository|pipeline/i],
    fix: "Route QR writes through qrDispatch → qrPipeline",
  },
  {
    id: "QR_OWNER_CONFLICT",
    category: "QR",
    severity: "HIGH",
    description: "Multiple QR state owners",
    pattern: /useState.*(?:qr|scan)(?:Result|Status|State)/i,
    excludePatterns: [/qr\.store|qrStore/i],
    fix: "Use qrStore as single owner for QR state",
  },
  {
    id: "DUPLICATE_QR_ACTION_PATH",
    category: "QR",
    severity: "HIGH",
    description: "Multiple QR action execution paths",
    pattern: /(?:executeQr|handleQr|processQr)(?:Action|Result|Scan)/i,
    excludePatterns: [/qr-dispatch/i],
    fix: "Single QR execution path through qrDispatch",
  },

  // ══════════════════════════════════════════════
  // CALL
  // ══════════════════════════════════════════════
  {
    id: "DUPLICATE_CALL_PIPELINE",
    category: "CALL",
    severity: "HIGH",
    description: "Multiple call initiation paths",
    pattern: /(?:startCall|initiateCall|beginCall|makeCall)\s*\(/,
    excludePatterns: [/executeStartCall|orbitDispatch|callStore/i],
    fix: "Route all calls through orbitDispatch(start_call)",
  },
  {
    id: "CALL_LISTENER_CONFLICT",
    category: "CALL",
    severity: "HIGH",
    description: "Multiple call event listeners for same event",
    pattern: /\.on\(.*(?:call|ring|signal)/i,
    excludePatterns: [/realtime-owner|callManager/i],
    fix: "Single call listener in canonical realtime owner",
  },
  {
    id: "DOUBLE_SIGNAL_SEND",
    category: "CALL",
    severity: "HIGH",
    description: "Signal sent from multiple locations",
    pattern: /broadcastCallSignal|sendSignal.*call/i,
    excludePatterns: [/repository|executeStartCall|executeAcceptCall/i],
    fix: "Single signal path through call executor pipeline",
  },
  {
    id: "CALL_SETUP_LATE",
    category: "CALL",
    severity: "HIGH",
    description: "Call overlay waits for network before displaying",
    pattern: /await.*(?:createCall|startCall).*(?:setShow|setVisible)/,
    excludePatterns: [/executeStartCall/i],
    fix: "Show overlay immediately (optimistic), transport async",
  },
  {
    id: "MULTI_OWNER_CALL_STATE",
    category: "CALL",
    severity: "HIGH",
    description: "Call state managed in multiple stores",
    pattern: /useState.*(?:callState|callStatus|isInCall|isCalling)/,
    excludePatterns: [/call\.store|callStore/i],
    fix: "Use callStore as single owner for call state",
  },
  {
    id: "CALL_OVERLAY_WAITING_NETWORK",
    category: "CALL",
    severity: "HIGH",
    description: "Call overlay display conditional on network response",
    pattern: /await.*(?:callSession|callSignal).*(?:overlay|show|visible)/,
    excludePatterns: [/executeStartCall/i],
    fix: "Show call overlay immediately, network async",
  },
  {
    id: "DEVICE_ROUTE_LOCAL_STATE_CONFLICT",
    category: "CALL",
    severity: "MEDIUM",
    description: "Audio device state managed locally instead of through controller",
    pattern: /useState.*(?:speaker|earpiece|muted|audioRoute)/i,
    excludePatterns: [/call\.store|callStore|audio-route|device-controller/i],
    fix: "Use callDeviceController → callStore.devices",
  },

  // ══════════════════════════════════════════════
  // MESSAGE STATUS
  // ══════════════════════════════════════════════
  {
    id: "STATUS_MACHINE_SPLIT",
    category: "MESSAGE_STATUS",
    severity: "HIGH",
    description: "Status transition logic duplicated outside canonical machine",
    pattern: /status\s*=\s*["'](?:sent|delivered|read|failed|retrying)["']/,
    excludePatterns: [/message-status\.machine|orbit\.store|pipeline|executor|receipt/i],
    fix: "Use resolveNextStatus from message-status.machine.ts",
  },
  {
    id: "INLINE_STATUS_WRITE",
    category: "MESSAGE_STATUS",
    severity: "HIGH",
    description: "Status updated directly without going through machine",
    pattern: /\.status\s*=\s*["'](?:delivered|read)["']/,
    excludePatterns: [/machine|store|normalizer/i],
    fix: "Use updateMessageStatus which enforces the status machine",
  },
  {
    id: "MULTIPLE_STATUS_BADGES",
    category: "MESSAGE_STATUS",
    severity: "HIGH",
    description: "Multiple tick/status display implementations",
    pattern: /(?:CheckCheck|Check)\s*className.*(?:text-blue|text-cyan|hud-cyan)/,
    excludePatterns: [/MessageStatusBadge\.tsx$/],
    fix: "Use MessageStatusBadge as the single status renderer",
  },
  {
    id: "RECEIPT_DIRECT_STATUS_WRITE",
    category: "MESSAGE_STATUS",
    severity: "HIGH",
    description: "Receipt handler writes status directly without machine",
    pattern: /(?:delivered|read).*(?:\.update|\.upsert|setState)/,
    excludePatterns: [/receipt-realtime\.handler|orbit\.store|message-status\.machine/i],
    fix: "Route receipt events through handleRealtimeReceipt",
  },

  // ══════════════════════════════════════════════
  // RETRY
  // ══════════════════════════════════════════════
  {
    id: "RETRY_RECREATES_MESSAGE",
    category: "RETRY",
    severity: "HIGH",
    description: "Retry creates a new message instead of resending existing",
    pattern: /retry.*(?:insert|create).*message/i,
    excludePatterns: [/executeRetryMessage/i],
    fix: "Retry reuses existing message ID and entry",
  },
  {
    id: "RETRY_BYPASSES_STATUS_MACHINE",
    category: "RETRY",
    severity: "HIGH",
    description: "Retry changes status without going through machine",
    pattern: /retry.*status\s*=\s*["'](?:sent|sending)["']/,
    excludePatterns: [/executeRetryMessage|message-status\.machine/i],
    fix: "Retry must transition through failed→retrying→sent via machine",
  },
  {
    id: "RETRY_DIRECT_WRITE",
    category: "RETRY",
    severity: "HIGH",
    description: "Retry writes directly to DB without executor pipeline",
    pattern: /retry.*supabase.*(?:insert|update)/i,
    excludePatterns: [/executeRetryMessage/i],
    fix: "Route retries through executeRetryMessage executor",
  },
  {
    id: "RETRY_CHANGES_BUBBLE_TYPE",
    category: "RETRY",
    severity: "HIGH",
    description: "Retry changes the message_type or bubble family",
    pattern: /retry.*message_type\s*[=:]/i,
    excludePatterns: [/executeRetryMessage/i],
    fix: "Retry must preserve original message_type and bubble family",
  },

  // ══════════════════════════════════════════════
  // GLOBAL
  // ══════════════════════════════════════════════
  {
    id: "GLOBAL_MESSAGE_RENDER",
    category: "GLOBAL",
    severity: "HIGH",
    description: "Message rendering bypasses MessageBubbleRouter",
    pattern: /(?:TextBubble|ImageBubble|VoiceBubble|VideoBubble)\s*(?:<|import)/,
    excludePatterns: [/BubbleRouter|MessageCardRenderer|families\/messages/i],
    fix: "Route all message rendering through MessageBubbleRouter",
  },
  {
    id: "OWNER_CONFLICT",
    category: "GLOBAL",
    severity: "HIGH",
    description: "Multiple stores/hooks owning same data domain",
    pattern: /create\(.*set\(.*(?:messages|conversations|calls)\s*:/,
    excludePatterns: [/orbit\.store|call\.store|qr\.store|card\.store/i],
    fix: "Single owner per domain: orbitStore, callStore, qrStore, cardStore",
  },
  {
    id: "DUPLICATE_RENDER_PATH",
    category: "GLOBAL",
    severity: "HIGH",
    description: "Same entity rendered by multiple unrelated components",
    pattern: /(?:CardShell|CardView|EntityCard|ShopCard|ListingCard)\s*(?:=|:)/,
    excludePatterns: [/CardShell\.tsx$/],
    fix: "Single CardShell family for all entity rendering",
  },
  {
    id: "ID_CONTEXT_MIXING",
    category: "GLOBAL",
    severity: "MEDIUM",
    description: "Mixing threadId/contextId with canonical conversationId/entityId",
    pattern: /threadId|contextId(?!\s*\/\/\s*legacy)/,
    excludePatterns: [/legacy|compat|migration/i],
    fix: "Use conversationId (communication) or entityId (business) only",
  },
];

/**
 * Get all rules by severity
 */
export function getRulesBySeverity(severity: RinkSeverity): RinkRule[] {
  return RINK_RULES.filter(r => r.severity === severity);
}

/**
 * Get all rules by category
 */
export function getRulesByCategory(category: string): RinkRule[] {
  return RINK_RULES.filter(r => r.category === category);
}

/**
 * Summary counts
 */
export function getRuleSummary(): Record<RinkSeverity, number> {
  return {
    HIGH: getRulesBySeverity("HIGH").length,
    MEDIUM: getRulesBySeverity("MEDIUM").length,
    LOW: getRulesBySeverity("LOW").length,
  };
}
