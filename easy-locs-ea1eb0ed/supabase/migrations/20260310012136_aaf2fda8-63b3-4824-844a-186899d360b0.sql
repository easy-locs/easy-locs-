
-- Phase 1: Expand team roles
-- Add new role values to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';

-- Create a function to get user's role within an org (used by RLS and frontend)
CREATE OR REPLACE FUNCTION public.get_org_role(_user_id uuid, _org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role::text FROM public.org_members
  WHERE user_id = _user_id AND org_id = _org_id
  LIMIT 1;
$$;

-- Create a function to check if user has minimum role level
-- Hierarchy: owner > admin > agent > staff > accountant > member
CREATE OR REPLACE FUNCTION public.has_min_role(_user_id uuid, _org_id uuid, _min_role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_role text;
  _role_level integer;
  _min_level integer;
BEGIN
  SELECT role::text INTO _user_role FROM public.org_members
  WHERE user_id = _user_id AND org_id = _org_id LIMIT 1;
  
  IF _user_role IS NULL THEN RETURN false; END IF;
  
  -- Role hierarchy levels (higher = more permissions)
  _role_level := CASE _user_role
    WHEN 'owner' THEN 100
    WHEN 'admin' THEN 80
    WHEN 'agent' THEN 60
    WHEN 'staff' THEN 40
    WHEN 'accountant' THEN 30
    WHEN 'member' THEN 20
    ELSE 0
  END;
  
  _min_level := CASE _min_role
    WHEN 'owner' THEN 100
    WHEN 'admin' THEN 80
    WHEN 'agent' THEN 60
    WHEN 'staff' THEN 40
    WHEN 'accountant' THEN 30
    WHEN 'member' THEN 20
    ELSE 0
  END;
  
  RETURN _role_level >= _min_level;
END;
$$;

-- Update accept_collaboration_invitation to support new roles
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

  -- Add user as org member with the invited role
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (inv.org_id, _user_id, inv.role::app_role)
  ON CONFLICT DO NOTHING;

  -- Mark invitation as accepted
  UPDATE public.collaboration_invitations SET status = 'accepted', accepted_at = now() WHERE id = inv.id;

  -- Notify org owner
  INSERT INTO public.notifications (user_id, org_id, type, title, message, link)
  VALUES (
    inv.invited_by, inv.org_id, 'info',
    '👥 Team member joined',
    inv.email || ' accepted the invitation as ' || inv.role || '.',
    '/dashboard/collaboration'
  );

  RETURN jsonb_build_object('success', true, 'org_id', inv.org_id);
END;
$$;
