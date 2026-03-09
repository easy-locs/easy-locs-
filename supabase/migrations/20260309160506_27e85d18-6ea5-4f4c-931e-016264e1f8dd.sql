-- Fix security definer views by making them security invoker
ALTER VIEW public.activities_public SET (security_invoker = true);
ALTER VIEW public.concierge_services_public SET (security_invoker = true);