
-- Fix SECURITY DEFINER view warning on owner_profiles_safe
-- Convert to SECURITY INVOKER (default) — safe because masking functions handle data protection
alter view public.owner_profiles_safe set (security_invoker = true);
