-- Task #343: Automatically clean up expired article cache entries
-- Adds a monitored cron job that deletes expired rows from article_content_cache daily.

CREATE OR REPLACE FUNCTION public.monitored_cleanup_article_content_cache()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_count integer;
BEGIN
  v_log_id := log_cron_start('cleanup-article-content-cache');
  BEGIN
    DELETE FROM article_content_cache WHERE expires_at < now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    PERFORM log_cron_finish(v_log_id, 'success', v_count);
  EXCEPTION WHEN OTHERS THEN
    PERFORM log_cron_finish(v_log_id, 'failure', 0, SQLERRM);
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.monitored_cleanup_article_content_cache() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.monitored_cleanup_article_content_cache() TO service_role;

DO $cron_article_cache$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('cleanup-article-content-cache');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'cleanup-article-content-cache',
      '0 2 * * *',
      $cron_body$SELECT public.monitored_cleanup_article_content_cache()$cron_body$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'article_content_cache cleanup schedule failed: %', SQLERRM;
END;
$cron_article_cache$;
