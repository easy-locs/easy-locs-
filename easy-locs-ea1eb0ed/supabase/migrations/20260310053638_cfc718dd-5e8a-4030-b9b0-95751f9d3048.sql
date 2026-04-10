CREATE OR REPLACE FUNCTION public.auto_generate_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.paid = true AND (OLD.paid IS NULL OR OLD.paid = false) THEN
    IF NEW.paid_amount IS NOT NULL AND NEW.total_amount IS NOT NULL 
       AND NEW.paid_amount < NEW.total_amount THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.documents (org_id, user_id, doc_type, title, country, data_json, status)
    SELECT
      NEW.org_id,
      o.owner_user_id,
      'rent-receipt',
      'Quittance ' || NEW.month,
      COALESCE(p.country, 'FR'),
      jsonb_build_object(
        'month', NEW.month,
        'rent_amount', NEW.rent_amount,
        'charges_amount', NEW.charges_amount,
        'total_amount', NEW.total_amount,
        'paid_date', COALESCE(NEW.paid_date, CURRENT_DATE::text),
        'tenant_id', NEW.tenant_id,
        'property_id', NEW.property_id
      ),
      'generated'
    FROM public.orgs o
    LEFT JOIN public.properties p ON p.id = NEW.property_id
    WHERE o.id = NEW.org_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$function$