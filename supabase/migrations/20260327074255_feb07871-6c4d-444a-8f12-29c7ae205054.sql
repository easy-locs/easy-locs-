
-- Phase 1: Disable heartbeat-only engines (dur=0, no real work)
UPDATE engine_supervisor SET enabled = false WHERE engine_name IN (
  'ai-feedback-recompute',
  'budget-fit',
  'context-awareness',
  'global-experience-refresh',
  'i18n-integrity',
  'invitation-scanner',
  'market-opportunity-scanner',
  'money-engine-scan',
  'next-best-action',
  'permission-check',
  'personal-offer',
  'radar-memory',
  'search-intent',
  'seo-mass-indexer',
  'session-intelligence',
  'store-consistency',
  'travel-mode',
  'travel-transition',
  'ui-ux-consistency',
  'ux-audit',
  'ux-autotest',
  'visual-consistency',
  'concrete-surface-sync'
);

-- Phase 2: Merge duplicates — disable secondaries
UPDATE engine_supervisor SET enabled = false WHERE engine_name IN (
  'backend-reconnect',
  'auto-repair',
  'digital-orchestration',
  'seo-check',
  'menu-intelligence'
);
