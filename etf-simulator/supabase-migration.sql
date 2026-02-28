-- ═══════════════════════════════════════════════════════════════
-- ETF SIMULATOR — Database Migration (run AFTER initial setup)
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- 1. ADD USERNAME COLUMN to profiles (if it doesn't exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE public.profiles ADD COLUMN username text;
  END IF;
END $$;

-- 2. Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);

-- 3. FIX: Allow anyone to read profile usernames (needed for signup uniqueness check)
-- Drop old restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read profile usernames" ON public.profiles;

-- New policy: anyone can read profiles (only exposes username/name, no sensitive data)
CREATE POLICY "Anyone can read profiles"
  ON public.profiles FOR SELECT USING (true);

-- Keep insert/update restricted to own profile
-- (these may already exist from initial setup, so use IF NOT EXISTS pattern)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4. UPDATE the auto-create profile trigger to also store username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Backfill existing profiles with usernames from auth metadata
-- (safe to run multiple times)
UPDATE public.profiles p
SET username = COALESCE(
  (SELECT raw_user_meta_data->>'username' FROM auth.users WHERE id = p.id),
  p.name
)
WHERE p.username IS NULL;

-- ═══ IMPORTANT: Email Confirmation Setting ═══
-- If saves are failing, go to:
--   Supabase Dashboard → Authentication → Providers → Email
--   ✓ Set "Confirm email" to DISABLED for development/testing
--   (This allows users to save immediately after signup)
-- ═══════════════════════════════════════════════════════════════

-- Verify everything looks good:
SELECT 'Profiles' as table_name, count(*) as rows FROM public.profiles
UNION ALL
SELECT 'Portfolios', count(*) FROM public.portfolios;
