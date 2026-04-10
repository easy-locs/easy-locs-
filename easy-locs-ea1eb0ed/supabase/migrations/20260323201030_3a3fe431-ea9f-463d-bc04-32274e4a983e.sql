-- Fix infinite recursion in workspace_members RLS policies
-- The admin_manage and read policies reference workspace_members itself, causing recursion.
-- Replace with SECURITY DEFINER functions to break the cycle.

-- Step 1: Create helper functions with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_workspace_member_direct(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin_direct(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
$$;

-- Step 2: Drop the recursive policies
DROP POLICY IF EXISTS "workspace_members_admin_manage" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_read" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_member" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_update_owner_admin" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert_owner_admin" ON public.workspace_members;

-- Step 3: Recreate with SECURITY DEFINER functions (no recursion)
CREATE POLICY "workspace_members_read"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_workspace_admin_direct(workspace_id)
  );

CREATE POLICY "workspace_members_admin_manage"
  ON public.workspace_members FOR ALL
  TO authenticated
  USING (is_workspace_admin_direct(workspace_id))
  WITH CHECK (is_workspace_admin_direct(workspace_id));

CREATE POLICY "workspace_members_insert_self"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
