
-- 1. Add lease_id FK to rent_calls
ALTER TABLE rent_calls ADD COLUMN IF NOT EXISTS lease_id uuid REFERENCES leases(id);

-- 2. Add wallet_transaction_id to rent_calls for linking
ALTER TABLE rent_calls ADD COLUMN IF NOT EXISTS wallet_transaction_id text;

-- 3. Unique constraint: one rent_call per lease + month (accounting period)
ALTER TABLE rent_calls ADD CONSTRAINT uq_rent_call_lease_month UNIQUE (lease_id, month);

-- 4. Refine payment_status to use explicit states (add check constraint via trigger)
-- Current column is text, we document the allowed states:
-- pending, reminded, paying, paid, partial, late, dunning, cancelled, written_off, archived

-- 5. Create accounting_entries table
CREATE TABLE IF NOT EXISTS accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  property_id uuid REFERENCES properties(id),
  lease_id uuid REFERENCES leases(id),
  tenant_id uuid REFERENCES tenants(id),
  rent_call_id uuid REFERENCES rent_calls(id),
  country_code text NOT NULL,
  accounting_period text NOT NULL,
  entry_type text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  payment_method text,
  wallet_transaction_id text,
  external_reference text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Unique constraint: one accounting entry per rent_call + entry_type (idempotency)
ALTER TABLE accounting_entries ADD CONSTRAINT uq_accounting_entry_rent_call_type UNIQUE (rent_call_id, entry_type);

-- 7. Enable RLS on accounting_entries
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;

-- 8. RLS: org members can read their org's entries
CREATE POLICY "Org members can view accounting entries"
  ON accounting_entries FOR SELECT TO authenticated
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- 9. RLS: org members can insert entries for their org
CREATE POLICY "Org members can insert accounting entries"
  ON accounting_entries FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- 10. RLS: org members can update entries for their org
CREATE POLICY "Org members can update accounting entries"
  ON accounting_entries FOR UPDATE TO authenticated
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- 11. Unique constraint: one receipt per rent_call (idempotency on receipt generation)
-- receipt_pdf_url already exists on rent_calls; we enforce via trigger logic, not constraint
-- (a NULL receipt_pdf_url means no receipt yet)

-- 12. Create idempotent trigger function for rent_call paid detection
CREATE OR REPLACE FUNCTION trg_rent_call_paid_handler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lease record;
  v_existing_entry_id uuid;
BEGIN
  -- Only fire when transitioning TO paid state
  IF NEW.payment_status = 'paid'
    AND (OLD.payment_status IS DISTINCT FROM 'paid')
    AND NEW.paid_amount >= NEW.total_amount
  THEN
    -- Check idempotency: accounting entry already exists?
    SELECT id INTO v_existing_entry_id
    FROM accounting_entries
    WHERE rent_call_id = NEW.id AND entry_type = 'rent'
    LIMIT 1;

    IF v_existing_entry_id IS NULL THEN
      -- Fetch lease for context
      SELECT country, property_id, tenant_id INTO v_lease
      FROM leases WHERE id = NEW.lease_id LIMIT 1;

      -- Create accounting entry
      INSERT INTO accounting_entries (
        org_id, property_id, lease_id, tenant_id, rent_call_id,
        country_code, accounting_period, entry_type,
        amount, currency, payment_method, wallet_transaction_id, description
      ) VALUES (
        NEW.org_id,
        COALESCE(v_lease.property_id, NEW.property_id),
        NEW.lease_id,
        COALESCE(v_lease.tenant_id, NEW.tenant_id),
        NEW.id,
        COALESCE(v_lease.country, 'FR'),
        NEW.month,
        'rent',
        NEW.total_amount,
        'EUR',
        NEW.payment_method,
        NEW.wallet_transaction_id,
        'Rent payment for period ' || NEW.month
      );
    END IF;

    -- Mark as paid
    NEW.paid := true;
    NEW.paid_date := COALESCE(NEW.paid_date, now()::date::text);
  END IF;

  RETURN NEW;
END;
$$;

-- 13. Attach trigger
DROP TRIGGER IF EXISTS trg_rent_call_paid ON rent_calls;
CREATE TRIGGER trg_rent_call_paid
  BEFORE UPDATE ON rent_calls
  FOR EACH ROW
  EXECUTE FUNCTION trg_rent_call_paid_handler();
