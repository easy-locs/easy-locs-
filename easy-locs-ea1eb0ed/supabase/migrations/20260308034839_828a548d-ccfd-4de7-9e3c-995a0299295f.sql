CREATE OR REPLACE FUNCTION public.get_public_service_availability(p_service_id uuid)
RETURNS TABLE(
  service_date date,
  service_time text,
  end_time text,
  quantity integer,
  status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.service_date,
    o.service_time,
    o.end_time,
    GREATEST(COALESCE(o.quantity, 1), 1)::integer AS quantity,
    o.status
  FROM public.concierge_orders o
  INNER JOIN public.concierge_services s ON s.id = o.service_id
  WHERE o.service_id = p_service_id
    AND s.active = true
    AND o.status = ANY (ARRAY['pending','awaiting_payment','paid','confirmed','in_progress','completed']);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_service_availability(uuid) TO anon, authenticated;