-- ============================================
-- SQL DATABASE EMAIL MULTI-USER SETUP
-- ============================================

-- =================
-- Emails table
-- =================

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  html_body TEXT,
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT CHECK (type IN ('incoming', 'outgoing')) NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  message_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_type ON emails(type);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_from ON emails(from_email);
CREATE INDEX IF NOT EXISTS idx_emails_to ON emails(to_email);

-- ===================
-- Profiles table
-- ===================

-- Create profiles table (linked to Supabase auth.users)
-- IMPORTANT NOTE: The email field needs to be edited with your actual domain
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT UNIQUE NOT NULL,
  email TEXT GENERATED ALWAYS AS (alias || '@example.com') STORED,
  forward_to TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_alias ON profiles(alias);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Link emails to profiles
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);

-- =======================
-- Triggers & functions
-- =======================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, alias, forward_to, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'alias',
    NEW.raw_user_meta_data->>'forward_to',
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================
-- Row Level Security (RLS)
-- ==========================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own emails" ON emails;
DROP POLICY IF EXISTS "Users can insert own emails" ON emails;
DROP POLICY IF EXISTS "Users can update own emails" ON emails;

-- Simplified RLS (no recursion)
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can read own emails"
  ON emails FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own emails"
  ON emails FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own emails"
  ON emails FOR UPDATE
  USING (user_id = auth.uid());

-- ==============
-- Final Check
-- ==============
SELECT 'Setup complete! Run:' AS message;
SELECT 'SELECT * FROM profiles;' AS query1;
SELECT 'SELECT * FROM emails LIMIT 5;' AS query2;
