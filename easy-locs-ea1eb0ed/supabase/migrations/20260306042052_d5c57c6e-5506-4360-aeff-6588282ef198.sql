
-- 1. Restore all missing DB triggers for notifications

-- Trigger for booking_requests (booking_request event)
CREATE OR REPLACE TRIGGER trg_notify_booking_request
  AFTER INSERT ON public.booking_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event('booking_request');

-- Trigger for seasonal_bookings (booking_created event)
CREATE OR REPLACE TRIGGER trg_notify_booking_created
  AFTER INSERT ON public.seasonal_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event('booking_created');

-- Trigger for leases (lease_created event)
CREATE OR REPLACE TRIGGER trg_notify_lease_created
  AFTER INSERT ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event('lease_created');

-- Trigger for interventions (intervention_created event)
CREATE OR REPLACE TRIGGER trg_notify_intervention_created
  AFTER INSERT ON public.interventions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event('intervention_created');

-- Trigger for rent_calls (payment_received on update)
CREATE OR REPLACE TRIGGER trg_notify_payment_received
  AFTER UPDATE ON public.rent_calls
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_received();

-- Trigger for inventory_reports (inventory_completed on update)
CREATE OR REPLACE TRIGGER trg_notify_inventory_completed
  AFTER UPDATE ON public.inventory_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_inventory_completed();

-- 2. Create collaboration_invitations table for multi-tenant collaboration
CREATE TABLE IF NOT EXISTS public.collaboration_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, email)
);

ALTER TABLE public.collaboration_invitations ENABLE ROW LEVEL SECURITY;

-- Org owners can manage invitations
CREATE POLICY "Org owners can manage invitations"
  ON public.collaboration_invitations FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orgs WHERE id = collaboration_invitations.org_id AND owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orgs WHERE id = collaboration_invitations.org_id AND owner_user_id = auth.uid()));

-- Org members can view invitations
CREATE POLICY "Org members can view invitations"
  ON public.collaboration_invitations FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));

-- 3. Function to accept collaboration invitation
CREATE OR REPLACE FUNCTION public.accept_collaboration_invitation(_token text, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv FROM public.collaboration_invitations
    WHERE token = _token AND status = 'pending' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation invalide ou expirée');
  END IF;

  -- Add user as org member
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (inv.org_id, _user_id, inv.role::app_role)
  ON CONFLICT DO NOTHING;

  -- Mark invitation as accepted
  UPDATE public.collaboration_invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;

  -- Notify org owner
  INSERT INTO public.notifications (user_id, org_id, type, title, message, link)
  VALUES (
    inv.invited_by, inv.org_id, 'info',
    '👥 Co-gestionnaire ajouté',
    inv.email || ' a accepté l''invitation et rejoint l''équipe.',
    '/dashboard/settings'
  );

  RETURN jsonb_build_object('success', true, 'org_id', inv.org_id);
END;
$$;

-- 4. Add ota_connections SELECT policy (was missing)
CREATE POLICY "Org members can read ota_connections"
  ON public.ota_connections FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), org_id));
