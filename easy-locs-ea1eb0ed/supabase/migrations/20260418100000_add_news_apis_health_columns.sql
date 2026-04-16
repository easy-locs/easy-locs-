ALTER TABLE analytics.integration_health_log
  ADD COLUMN IF NOT EXISTS news_apis_status TEXT,
  ADD COLUMN IF NOT EXISTS news_apis_latency_ms INTEGER;

COMMENT ON COLUMN analytics.integration_health_log.news_apis_status IS 'Health status for news API providers (GNews/NewsData). Values: ok, error, partial, not_configured.';
COMMENT ON COLUMN analytics.integration_health_log.news_apis_latency_ms IS 'Combined latency in ms for news API health checks.';
