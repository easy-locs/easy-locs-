-- Fix CALL: Realtime CHANNEL_ERROR because call_logs has DEFAULT replica identity
-- Column-filtered realtime subscriptions require FULL to include filter columns in change payloads
ALTER TABLE public.call_logs REPLICA IDENTITY FULL;