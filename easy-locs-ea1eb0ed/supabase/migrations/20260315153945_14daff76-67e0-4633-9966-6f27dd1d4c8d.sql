
-- Security definer function to check group membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Security definer function to check group admin
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id AND role = 'admin'
  )
$$;

-- ═══ Fix group_members policies ═══
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.group_members;

CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can insert themselves or admins can add"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_group_admin(auth.uid(), group_id)
  );

CREATE POLICY "Self or admin can remove members"
  ON public.group_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_group_admin(auth.uid(), group_id)
  );

-- ═══ Fix groups policies (had bug: gm.group_id = gm.id instead of groups.id) ═══
DROP POLICY IF EXISTS "Members can view groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can delete groups" ON public.groups;

CREATE POLICY "Members can view groups"
  ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), id));

CREATE POLICY "Admins can update groups"
  ON public.groups FOR UPDATE TO authenticated
  USING (public.is_group_admin(auth.uid(), id));

CREATE POLICY "Admins can delete groups"
  ON public.groups FOR DELETE TO authenticated
  USING (public.is_group_admin(auth.uid(), id));

-- ═══ Fix group_messages policies (also reference group_members causing recursion) ═══
DROP POLICY IF EXISTS "Members can view group messages" ON public.group_messages;
DROP POLICY IF EXISTS "Members can send group messages" ON public.group_messages;

CREATE POLICY "Members can view group messages"
  ON public.group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can send group messages"
  ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_group_member(auth.uid(), group_id)
  );
