
-- Table for tenant invitations
CREATE TABLE public.tenant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, accepted, expired
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz
);

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Landlord can manage invitations
CREATE POLICY "Org members can read invitations"
  ON public.tenant_invitations FOR SELECT
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can create invitations"
  ON public.tenant_invitations FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), org_id) AND invited_by = auth.uid());

CREATE POLICY "Org members can update invitations"
  ON public.tenant_invitations FOR UPDATE
  USING (is_org_member(auth.uid(), org_id));

CREATE POLICY "Org members can delete invitations"
  ON public.tenant_invitations FOR DELETE
  USING (is_org_member(auth.uid(), org_id));

-- Public read for accepting (token-based, validated in code)
CREATE POLICY "Anyone can read by token"
  ON public.tenant_invitations FOR SELECT
  USING (true);

-- Function to link tenant account after signup
CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(_token text, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv FROM public.tenant_invitations
    WHERE token = _token AND status = 'pending' AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation invalide ou expirée');
  END IF;

  -- Update tenant with user_id
  UPDATE public.tenants SET tenant_user_id = _user_id WHERE id = inv.tenant_id;

  -- Update profile to tenant type
  UPDATE public.profiles SET user_type = 'tenant' WHERE id = _user_id;

  -- Mark invitation as accepted
  UPDATE public.tenant_invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;

  -- Create notification for landlord
  INSERT INTO public.notifications (user_id, org_id, type, title, message, link)
  VALUES (
    inv.invited_by,
    inv.org_id,
    'info',
    '✅ Locataire activé',
    (SELECT name FROM public.tenants WHERE id = inv.tenant_id) || ' a créé son compte et est maintenant actif.',
    '/dashboard/rental?tab=tenants'
  );

  RETURN jsonb_build_object('success', true, 'tenant_id', inv.tenant_id);
END;
$$;
