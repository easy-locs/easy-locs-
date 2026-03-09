
-- Create/replace RPC that checks BOTH concierge_orders AND marketplace_bookings for availability
CREATE OR REPLACE FUNCTION public.get_public_service_availability(p_service_id uuid)
 RETURNS TABLE(service_date date, service_time text, end_time text, quantity integer, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Concierge orders
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
    AND o.status = ANY (ARRAY['pending','awaiting_payment','paid','confirmed','in_progress','completed'])

  UNION ALL

  -- Marketplace bookings
  SELECT
    mb.service_date,
    mb.service_time,
    mb.date_to::text AS end_time,
    GREATEST(COALESCE(mb.quantity, 1), 1)::integer AS quantity,
    mb.status
  FROM public.marketplace_bookings mb
  INNER JOIN public.marketplace_services ms ON ms.id = mb.service_id
  WHERE mb.service_id = p_service_id
    AND ms.active = true
    AND mb.status = ANY (ARRAY['pending','confirmed','completed']);
$function$;
