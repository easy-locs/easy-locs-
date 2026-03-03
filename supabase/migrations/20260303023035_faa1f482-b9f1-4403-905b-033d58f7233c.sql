CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(_token text, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv record;
  caller_id uuid;
BEGIN
  -- Security check: ensure the caller is either the user themselves or a service role caller
  caller_id := auth.uid();
  IF caller_id IS NOT NULL AND caller_id != _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: user mismatch');
  END IF;

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