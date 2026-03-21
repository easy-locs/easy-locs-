-- Grant wallet_transfer RPC to authenticated users
GRANT EXECUTE ON FUNCTION public.wallet_transfer(uuid, uuid, numeric, text, text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_transfer(uuid, uuid, numeric, text, text, text, text, text, jsonb) TO service_role;