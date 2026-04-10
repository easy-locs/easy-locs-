
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'member');

-- Profiles table (auto-created on signup via trigger)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT DEFAULT '',
  country TEXT DEFAULT 'FR',
  locale TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Orgs
CREATE TABLE public.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Mon organisation',
  country TEXT NOT NULL DEFAULT 'FR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

-- Org members
CREATE TABLE public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- User roles (for admin checks via has_role)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country TEXT NOT NULL DEFAULT 'FR',
  doc_type TEXT NOT NULL,
  template_id TEXT,
  template_version TEXT,
  title TEXT NOT NULL,
  data_json JSONB NOT NULL DEFAULT '{}',
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Vault files
CREATE TABLE public.vault_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  tags_json JSONB DEFAULT '[]',
  size BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vault_files ENABLE ROW LEVEL SECURITY;

-- Reminders
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  schedule_json JSONB DEFAULT '{}',
  next_run_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- Share links
CREATE TABLE public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SECURITY DEFINER FUNCTIONS
-- ==========================================

-- Check if user is member of org
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's org_id (first org they're a member of)
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT org_id FROM public.org_members WHERE user_id = _user_id LIMIT 1
$$;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

-- Orgs: members can see their orgs
CREATE POLICY "Org members can read org" ON public.orgs FOR SELECT USING (public.is_org_member(auth.uid(), id));
CREATE POLICY "Owner can update org" ON public.orgs FOR UPDATE USING (owner_user_id = auth.uid());
CREATE POLICY "Users can create orgs" ON public.orgs FOR INSERT WITH CHECK (owner_user_id = auth.uid());

-- Org members: members can see other members in their org
CREATE POLICY "Members can read org members" ON public.org_members FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Owners can manage members" ON public.org_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orgs WHERE id = org_id AND owner_user_id = auth.uid())
  OR (user_id = auth.uid()) -- allow self-insert during onboarding
);
CREATE POLICY "Owners can delete members" ON public.org_members FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.orgs WHERE id = org_id AND owner_user_id = auth.uid())
);

-- User roles: only viewable by the user themselves
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- Documents: org-scoped access
CREATE POLICY "Org members can read docs" ON public.documents FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can create docs" ON public.documents FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Doc owner can update" ON public.documents FOR UPDATE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Doc owner can delete" ON public.documents FOR DELETE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));

-- Vault files: org-scoped
CREATE POLICY "Org members can read vault" ON public.vault_files FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can upload" ON public.vault_files FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "File owner can delete" ON public.vault_files FOR DELETE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));

-- Reminders: org-scoped
CREATE POLICY "Org members can read reminders" ON public.reminders FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can create reminders" ON public.reminders FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id) AND user_id = auth.uid());
CREATE POLICY "Reminder owner can update" ON public.reminders FOR UPDATE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Reminder owner can delete" ON public.reminders FOR DELETE USING (user_id = auth.uid() AND public.is_org_member(auth.uid(), org_id));

-- Share links: org-scoped
CREATE POLICY "Org members can read shares" ON public.share_links FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can create shares" ON public.share_links FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Org members can delete shares" ON public.share_links FOR DELETE USING (public.is_org_member(auth.uid(), org_id));

-- Audit logs: org members can read, system inserts
CREATE POLICY "Org members can read audit logs" ON public.audit_logs FOR SELECT USING (public.is_org_member(auth.uid(), org_id));
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ==========================================
-- TRIGGERS: auto-create profile + org on signup
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
