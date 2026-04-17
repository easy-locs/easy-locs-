-- captured_at: 2026-04-16T23:46:15Z
-- http: 400
-- query:
SELECT jobname, schedule, active FROM cron.job WHERE jobname ILIKE 'execution%' OR jobname ILIKE 'autonomous%' OR jobname ILIKE 'agent%' ORDER BY jobname;
