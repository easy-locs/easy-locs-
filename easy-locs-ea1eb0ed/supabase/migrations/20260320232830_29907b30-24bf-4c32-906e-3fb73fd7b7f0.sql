CREATE OR REPLACE FUNCTION public.update_listing_freshness_scores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE marketplace_services
  SET freshness_score = GREATEST(0, 1.0 - EXTRACT(EPOCH FROM (now() - COALESCE(published_at, created_at))) / (30 * 86400))
  WHERE active = true AND status = 'published';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;