-- Fix 1: Recreate owner_profiles_safe as security_invoker view
-- This ensures underlying table RLS policies (user_id = auth.uid()) are enforced
DROP VIEW IF EXISTS owner_profiles_safe;

CREATE VIEW owner_profiles_safe
WITH (security_invoker = true)
AS
SELECT op.id,
  op.user_id,
  op.full_name,
  op.company_name,
  op.city,
  op.country,
  mask_email(upd.email) AS email,
  mask_phone(upd.phone) AS phone,
  mask_iban(opf.iban) AS bank_iban
FROM owner_profiles op
LEFT JOIN user_private_data upd ON upd.user_id = op.user_id
LEFT JOIN owner_private_financials opf ON opf.user_id = op.user_id;

-- Fix 2: Replace chat-attachments DELETE policy with ownership check
DROP POLICY IF EXISTS "Users can delete own chat attachments" ON storage.objects;

CREATE POLICY "Users can delete own chat attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );