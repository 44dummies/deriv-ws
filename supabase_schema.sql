-- ============================================
-- NEXATRADE SUPABASE SCHEMA
-- ============================================
-- Run this in your Supabase SQL Editor to set up the database
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Stores Deriv user profile information

CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deriv_login_id TEXT UNIQUE NOT NULL,
  email TEXT,
  fullname TEXT,
  currency TEXT DEFAULT 'USD',
  is_virtual BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 2. JOURNAL ENTRIES TABLE
-- ============================================
-- Stores trading journal entries

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deriv_login_id TEXT NOT NULL REFERENCES profiles(deriv_login_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT DEFAULT 'neutral' CHECK (mood IN ('great', 'good', 'neutral', 'bad')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own journal entries
CREATE POLICY "Users can view own journal entries" ON journal_entries
  FOR SELECT USING (true);

CREATE POLICY "Users can create own journal entries" ON journal_entries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own journal entries" ON journal_entries
  FOR DELETE USING (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_login ON journal_entries(deriv_login_id);

-- ============================================
-- 3. FRIENDS TABLE
-- ============================================
-- Stores friend relationships

CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_login_id TEXT NOT NULL REFERENCES profiles(deriv_login_id) ON DELETE CASCADE,
  friend_name TEXT NOT NULL,
  friend_login_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own friends" ON friends
  FOR SELECT USING (true);

CREATE POLICY "Users can add friends" ON friends
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can remove friends" ON friends
  FOR DELETE USING (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_login_id);

-- ============================================
-- 4. TRADES TABLE
-- ============================================
-- Stores synced trade history from Deriv

CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deriv_login_id TEXT NOT NULL REFERENCES profiles(deriv_login_id) ON DELETE CASCADE,
  contract_id TEXT NOT NULL,
  symbol TEXT,
  buy_price DECIMAL(20, 8) DEFAULT 0,
  sell_price DECIMAL(20, 8) DEFAULT 0,
  profit DECIMAL(20, 8) DEFAULT 0,
  purchase_time TIMESTAMPTZ,
  sell_time TIMESTAMPTZ,
  shortcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deriv_login_id, contract_id)
);

-- Enable RLS
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (true);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_trades_login ON trades(deriv_login_id);
CREATE INDEX IF NOT EXISTS idx_trades_sell_time ON trades(sell_time DESC);

-- ============================================
-- 5. USER SETTINGS TABLE
-- ============================================
-- Stores user preferences

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deriv_login_id TEXT UNIQUE NOT NULL REFERENCES profiles(deriv_login_id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (true);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can upsert own settings" ON user_settings
  FOR UPDATE USING (true);

-- ============================================
-- 6. ANALYTICS CACHE TABLE (Optional)
-- ============================================
-- Stores computed analytics for faster loading

CREATE TABLE IF NOT EXISTS analytics_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deriv_login_id TEXT UNIQUE NOT NULL REFERENCES profiles(deriv_login_id) ON DELETE CASCADE,
  total_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  total_profit DECIMAL(20, 8) DEFAULT 0,
  avg_profit DECIMAL(20, 8) DEFAULT 0,
  best_trade DECIMAL(20, 8) DEFAULT 0,
  worst_trade DECIMAL(20, 8) DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  loss_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics" ON analytics_cache
  FOR SELECT USING (true);

CREATE POLICY "Users can update own analytics" ON analytics_cache
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can upsert own analytics" ON analytics_cache
  FOR UPDATE USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_cache_updated_at
  BEFORE UPDATE ON analytics_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DONE!
-- ============================================
-- After running this SQL:
-- 1. Get your Supabase URL and Anon Key from Settings > API
-- 2. Add them to your .env file:
--    REACT_APP_SUPABASE_URL=your_supabase_url
--    REACT_APP_SUPABASE_ANON_KEY=your_anon_key
