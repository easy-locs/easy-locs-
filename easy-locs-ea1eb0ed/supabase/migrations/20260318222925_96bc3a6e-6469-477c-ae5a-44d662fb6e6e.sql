-- Clean slate: drop all old policies
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON audit_reports;
DROP POLICY IF EXISTS "Insert own audit report" ON audit_reports;
DROP POLICY IF EXISTS "Users can insert own audit reports" ON audit_reports;
DROP POLICY IF EXISTS "debug insert audit reports" ON audit_reports;
DROP POLICY IF EXISTS "Users can view own audit reports" ON audit_reports;
DROP POLICY IF EXISTS "audit_insert_own" ON audit_reports;
DROP POLICY IF EXISTS "audit_update_own" ON audit_reports;
DROP POLICY IF EXISTS "audit_debug_insert" ON audit_reports;

-- Default created_by to current user
ALTER TABLE audit_reports ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Insert own
CREATE POLICY "audit_insert_own"
ON audit_reports FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- Select own
CREATE POLICY "audit_select_own"
ON audit_reports FOR SELECT TO authenticated
USING (created_by = auth.uid());

-- Update own
CREATE POLICY "audit_update_own"
ON audit_reports FOR UPDATE TO authenticated
USING (created_by = auth.uid());