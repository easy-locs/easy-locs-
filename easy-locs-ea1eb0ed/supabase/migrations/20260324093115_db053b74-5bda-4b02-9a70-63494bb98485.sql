
-- Fix: suggest_onboarding_template without referencing missing table
-- Just create a stub that returns empty until onboarding_templates exists
CREATE OR REPLACE FUNCTION public.suggest_onboarding_template(
  p_vertical text,
  p_city text DEFAULT NULL,
  p_subcategory text DEFAULT NULL
)
RETURNS TABLE(template_id uuid, template_name text, priority integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Stub: returns empty until onboarding_templates table is created
  SELECT null::uuid, null::text, null::integer WHERE false;
$$;
