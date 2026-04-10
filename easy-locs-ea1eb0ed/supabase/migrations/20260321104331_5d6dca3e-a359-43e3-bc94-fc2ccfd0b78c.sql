-- Fix: call_logs needs FULL replica identity for Realtime + RLS to work
ALTER TABLE public.call_logs REPLICA IDENTITY FULL;