
-- Add trial_ends_at column
ALTER TABLE public.subscriptions ADD COLUMN trial_ends_at timestamptz;

-- Update handle_new_user to auto-create 3-day trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'name', ''));

  -- Create default org
  new_org_id := gen_random_uuid();
  INSERT INTO public.orgs (id, owner_user_id, name)
  VALUES (new_org_id, NEW.id, 'Mon organisation');

  -- Add user as owner member
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  -- Create 3-day trial subscription
  INSERT INTO public.subscriptions (user_id, plan, status, trial_ends_at)
  VALUES (NEW.id, 'trial', 'trialing', now() + interval '3 days');

  RETURN NEW;
END;
$function$;
