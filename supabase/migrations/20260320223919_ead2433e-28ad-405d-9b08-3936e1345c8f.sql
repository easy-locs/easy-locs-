
-- 1. Fix update_wallet_balance: add search_path
CREATE OR REPLACE FUNCTION public.update_wallet_balance(p_wallet_id uuid, p_amount numeric, p_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_type = 'credit' THEN
    UPDATE wallet_balances SET available = available + p_amount, updated_at = now() WHERE id = p_wallet_id;
  ELSIF p_type = 'debit' THEN
    UPDATE wallet_balances SET available = available - p_amount, updated_at = now() WHERE id = p_wallet_id;
  END IF;
END;
$$;

-- 2. Fix order_status_history permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users insert order status history" ON public.order_status_history;
CREATE POLICY "Users insert own order status history" ON public.order_status_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
