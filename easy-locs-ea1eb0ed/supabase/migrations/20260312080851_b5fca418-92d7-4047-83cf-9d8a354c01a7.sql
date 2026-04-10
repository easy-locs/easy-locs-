
-- 1. Add signature tracking columns to leases
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS tenant_signed_at timestamptz;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS owner_signed_at timestamptz;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS rent_schedule_generated boolean NOT NULL DEFAULT false;

-- 2. Create a trigger function that generates rent schedule ONLY after both signatures
CREATE OR REPLACE FUNCTION public.on_lease_fully_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  -- Only fire when status changes to 'active' (both signed)
  IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' 
     AND NEW.rent_schedule_generated = false THEN
    
    -- Mark as generating to prevent duplicates
    NEW.rent_schedule_generated := true;
    
    -- Audit log
    INSERT INTO public.audit_logs (user_id, org_id, action, metadata_json)
    VALUES (
      auth.uid(),
      NEW.org_id,
      'lease_activated_rent_schedule_pending',
      jsonb_build_object(
        'lease_id', NEW.id,
        'tenant_id', NEW.tenant_id,
        'property_id', NEW.property_id,
        'country', COALESCE(NEW.country, ''),
        'tenant_signed_at', NEW.tenant_signed_at,
        'owner_signed_at', NEW.owner_signed_at
      )
    );
    
    -- Notify owner that lease is now active
    PERFORM (
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/lease-workflow',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
        ),
        body := jsonb_build_object(
          'action', 'generate_rent_schedule',
          'lease_id', NEW.id
        )
      )
    );
  END IF;
  
  RETURN NEW;
END;
$fn$;

-- 3. Create trigger on leases table
DROP TRIGGER IF EXISTS trg_lease_fully_signed ON public.leases;
CREATE TRIGGER trg_lease_fully_signed
  BEFORE UPDATE ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.on_lease_fully_signed();

-- 4. Add document routing columns to documents table
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS routing_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS routed_to jsonb DEFAULT '[]'::jsonb;

-- 5. Create document routing trigger
CREATE OR REPLACE FUNCTION public.auto_route_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  _routed jsonb := '[]'::jsonb;
  _lease record;
BEGIN
  -- If document has a lease_id, extract property_id and tenant_id
  IF NEW.lease_id IS NOT NULL AND (NEW.property_id IS NULL OR NEW.tenant_id IS NULL) THEN
    SELECT property_id, tenant_id INTO _lease
    FROM public.leases WHERE id = NEW.lease_id LIMIT 1;
    
    IF _lease IS NOT NULL THEN
      NEW.property_id := COALESCE(NEW.property_id, _lease.property_id);
      NEW.tenant_id := COALESCE(NEW.tenant_id, _lease.tenant_id);
    END IF;
  END IF;
  
  -- Build routing list
  IF NEW.property_id IS NOT NULL THEN
    _routed := _routed || jsonb_build_array('property_file');
  END IF;
  IF NEW.tenant_id IS NOT NULL THEN
    _routed := _routed || jsonb_build_array('tenant_file');
  END IF;
  IF NEW.lease_id IS NOT NULL THEN
    _routed := _routed || jsonb_build_array('lease_file');
  END IF;
  IF NEW.doc_type IN ('rent-receipt', 'payment-notice', 'dunning') THEN
    _routed := _routed || jsonb_build_array('accounting_record');
  END IF;
  _routed := _routed || jsonb_build_array('owner_dashboard');
  IF NEW.tenant_id IS NOT NULL THEN
    _routed := _routed || jsonb_build_array('tenant_portal');
  END IF;
  
  NEW.routed_to := _routed;
  NEW.routing_status := 'routed';
  
  -- Audit
  INSERT INTO public.audit_logs (user_id, org_id, action, metadata_json)
  VALUES (
    COALESCE(auth.uid(), NEW.user_id),
    NEW.org_id,
    'document_routed',
    jsonb_build_object(
      'document_id', NEW.id,
      'doc_type', NEW.doc_type,
      'routed_to', _routed,
      'property_id', NEW.property_id,
      'tenant_id', NEW.tenant_id,
      'lease_id', NEW.lease_id
    )
  );
  
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_auto_route_document ON public.documents;
CREATE TRIGGER trg_auto_route_document
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_route_document();
