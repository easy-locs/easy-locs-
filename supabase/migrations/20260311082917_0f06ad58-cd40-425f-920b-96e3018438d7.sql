
DROP FUNCTION public.get_provider_reviews(uuid, integer, integer);

CREATE FUNCTION public.get_provider_reviews(p_provider_id uuid, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, reviewer_name text, rating numeric, comment text, response text, service_title text, verified boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT r.id, r.reviewer_name, r.rating, r.comment, r.response,
         ms.title AS service_title, r.verified, r.created_at
  FROM public.marketplace_reviews r
  LEFT JOIN public.marketplace_services ms ON ms.id = r.service_id
  WHERE r.provider_id = p_provider_id AND r.status = 'published'
  ORDER BY r.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
