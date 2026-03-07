-- ═══════════════════════════════════════════════════════════════
-- UPDATE USERNAME: Henrique Diederichs → DukeNuKeMz
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- 1. Update auth.users metadata (this is what the app reads on login)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  jsonb_set(raw_user_meta_data, '{username}', '"DukeNuKeMz"'),
  '{name}', '"DukeNuKeMz"'
)
WHERE email = 'hdiederichs3971@gmail.com';

-- 2. Update profiles table
UPDATE public.profiles
SET name = 'DukeNuKeMz', username = 'DukeNuKeMz'
WHERE email = 'hdiederichs3971@gmail.com';

-- 3. Update creator name in all your saved portfolios
UPDATE public.portfolios
SET portfolio_data = jsonb_set(portfolio_data, '{creator}', '"DukeNuKeMz"')
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hdiederichs3971@gmail.com');

-- Verify:
SELECT email, raw_user_meta_data->>'username' as username, raw_user_meta_data->>'name' as name
FROM auth.users WHERE email = 'hdiederichs3971@gmail.com';

SELECT name, username FROM public.profiles WHERE email = 'hdiederichs3971@gmail.com';

SELECT id, name, portfolio_data->>'creator' as creator
FROM public.portfolios
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'hdiederichs3971@gmail.com');
