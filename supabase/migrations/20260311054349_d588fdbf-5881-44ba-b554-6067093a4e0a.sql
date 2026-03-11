-- Create a generic audit trigger function that logs INSERT/UPDATE/DELETE on critical tables
CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _action text;
  _record_id text;
  _user_id uuid;
  _org_id uuid;
  _meta jsonb;
BEGIN
  -- Determine action
  _action := TG_ARGV[0] || '_' || LOWER(TG_OP);
  
  -- Extract record id and org_id
  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id::text;
    _org_id := OLD.org_id;
    _user_id := COALESCE(auth.uid(), OLD.user_id);
  ELSE
    _record_id := NEW.id::text;
    _org_id := NEW.org_id;
    _user_id := COALESCE(auth.uid(), NEW.user_id);
  END IF;

  IF _user_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Build metadata
  _meta := jsonb_build_object(
    'record_id', _record_id,
    'table', TG_TABLE_NAME,
    'operation', TG_OP
  );

  -- Add label/name for context
  IF TG_OP != 'DELETE' THEN
    BEGIN
      _meta := _meta || jsonb_build_object('label', NEW.label);
    EXCEPTION WHEN undefined_column THEN
      BEGIN
        _meta := _meta || jsonb_build_object('name', NEW.name);
      EXCEPTION WHEN undefined_column THEN
        BEGIN
          _meta := _meta || jsonb_build_object('title', NEW.title);
        EXCEPTION WHEN undefined_column THEN
          NULL;
        END;
      END;
    END;
  END IF;

  -- Insert audit log (fire and forget via exception handler)
  BEGIN
    INSERT INTO public.audit_logs (user_id, org_id, action, metadata_json)
    VALUES (_user_id, _org_id, _action, _meta);
  EXCEPTION WHEN OTHERS THEN
    -- Never fail the original operation
    NULL;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply triggers to critical tables
-- Properties
CREATE TRIGGER audit_properties_change
  AFTER INSERT OR UPDATE OR DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('property');

-- Tenants
CREATE TRIGGER audit_tenants_change
  AFTER INSERT OR UPDATE OR DELETE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('tenant');

-- Leases
CREATE TRIGGER audit_leases_change
  AFTER INSERT OR UPDATE OR DELETE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('lease');

-- Expenses
CREATE TRIGGER audit_expenses_change
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('expense');

-- Interventions
CREATE TRIGGER audit_interventions_change
  AFTER INSERT OR UPDATE OR DELETE ON public.interventions
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('intervention');

-- Rent calls (payment tracking)
CREATE TRIGGER audit_rent_calls_change
  AFTER INSERT OR UPDATE ON public.rent_calls
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('rent_call');

-- Booking requests
CREATE TRIGGER audit_booking_requests_change
  AFTER INSERT OR UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('booking_request');

-- Marketplace bookings
CREATE TRIGGER audit_marketplace_bookings_change
  AFTER INSERT OR UPDATE ON public.marketplace_bookings
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('marketplace_booking');

-- Concierge orders
CREATE TRIGGER audit_concierge_orders_change
  AFTER INSERT OR UPDATE ON public.concierge_orders
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('concierge_order');

-- Org members (team changes)
CREATE TRIGGER audit_org_members_change
  AFTER INSERT OR UPDATE OR DELETE ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('org_member');

-- Real estate listings
CREATE TRIGGER audit_real_estate_listings_change
  AFTER INSERT OR UPDATE OR DELETE ON public.real_estate_listings
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('listing');

-- Marketplace services
CREATE TRIGGER audit_marketplace_services_change
  AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_services
  FOR EACH ROW EXECUTE FUNCTION audit_table_change('service');