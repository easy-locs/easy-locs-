-- Seed wallet_balances_v2 for test user with 500 AED
INSERT INTO public.wallet_balances_v2 (user_id, balance)
VALUES ('2d71d5bd-12e1-4c20-871d-291178ae3f4c', 500)
ON CONFLICT (user_id) DO UPDATE SET balance = 500;

-- Also seed a second test user so transfers have a recipient
INSERT INTO public.wallet_balances_v2 (user_id, balance)
VALUES ('10c27f74-2db7-4a08-af6a-37f6cd1f97a3', 0)
ON CONFLICT (user_id) DO NOTHING;

-- Update wallet_accounts balance to match (UI reads from here)
UPDATE public.wallet_accounts
SET balance = 500
WHERE owner_user_id = '2d71d5bd-12e1-4c20-871d-291178ae3f4c' AND currency = 'AED';

-- Add second user to org so calls can resolve a receiver
INSERT INTO public.org_members (org_id, user_id, role)
VALUES ('55e39dc1-8aac-4e74-a1e5-002149314033', '10c27f74-2db7-4a08-af6a-37f6cd1f97a3', 'member')
ON CONFLICT DO NOTHING;