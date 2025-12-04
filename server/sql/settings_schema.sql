-- =============================================
-- SETTINGS SYSTEM SQL SCHEMA
-- Enterprise-Grade User Settings for Trading Platform
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USER SETTINGS TABLE
-- Core settings for privacy, notifications, security
-- =============================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Privacy Settings
  online_visibility BOOLEAN DEFAULT TRUE,
  profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
  allow_messages_from VARCHAR(20) DEFAULT 'everyone' CHECK (allow_messages_from IN ('everyone', 'friends', 'none')),
  allow_tags_from VARCHAR(20) DEFAULT 'everyone' CHECK (allow_tags_from IN ('everyone', 'friends', 'none')),
  show_trading_stats BOOLEAN DEFAULT TRUE,
  show_on_leaderboard BOOLEAN DEFAULT TRUE,
  searchable BOOLEAN DEFAULT TRUE,
  
  -- Notification Settings
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  trade_alerts BOOLEAN DEFAULT TRUE,
  community_mentions BOOLEAN DEFAULT TRUE,
  comment_notifications BOOLEAN DEFAULT TRUE,
  follower_notifications BOOLEAN DEFAULT TRUE,
  admin_announcements BOOLEAN DEFAULT TRUE,
  login_alerts BOOLEAN DEFAULT TRUE,
  
  -- Security Settings
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  trusted_devices JSONB DEFAULT '[]',
  session_timeout INTEGER DEFAULT 30, -- minutes
  require_password_change BOOLEAN DEFAULT FALSE,
  last_password_change TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Indexes for user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- =============================================
-- TRADING PREFERENCES TABLE
-- User's trading configuration
-- =============================================
CREATE TABLE IF NOT EXISTS trading_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Market Preferences
  default_market VARCHAR(50) DEFAULT 'boom_crash' CHECK (default_market IN ('boom_crash', 'forex', 'indices', 'commodities', 'crypto')),
  favorite_markets JSONB DEFAULT '["boom_crash"]',
  default_trade_amount DECIMAL(15, 2) DEFAULT 10.00,
  max_trade_amount DECIMAL(15, 2) DEFAULT 1000.00,
  
  -- Risk Settings
  risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'aggressive')),
  stop_loss_enabled BOOLEAN DEFAULT TRUE,
  default_stop_loss_percent DECIMAL(5, 2) DEFAULT 5.00,
  take_profit_enabled BOOLEAN DEFAULT TRUE,
  default_take_profit_percent DECIMAL(5, 2) DEFAULT 10.00,
  max_daily_loss DECIMAL(15, 2),
  max_open_trades INTEGER DEFAULT 5,
  
  -- Sound Settings
  sound_enabled BOOLEAN DEFAULT TRUE,
  sound_trade_open BOOLEAN DEFAULT TRUE,
  sound_trade_win BOOLEAN DEFAULT TRUE,
  sound_trade_loss BOOLEAN DEFAULT TRUE,
  sound_volume INTEGER DEFAULT 70 CHECK (sound_volume >= 0 AND sound_volume <= 100),
  
  -- Display Preferences
  chart_theme VARCHAR(20) DEFAULT 'dark',
  default_timeframe VARCHAR(10) DEFAULT '1m',
  show_trade_history BOOLEAN DEFAULT TRUE,
  compact_mode BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Indexes for trading_preferences
CREATE INDEX IF NOT EXISTS idx_trading_prefs_user_id ON trading_preferences(user_id);

-- =============================================
-- LOGIN ACTIVITY TABLE
-- Track user login history with device info
-- =============================================
CREATE TABLE IF NOT EXISTS login_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Session Info
  session_token TEXT,
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  device_name VARCHAR(100),
  browser VARCHAR(100),
  os VARCHAR(100),
  location_country VARCHAR(100),
  location_city VARCHAR(100),
  
  -- Status
  login_status VARCHAR(20) DEFAULT 'success' CHECK (login_status IN ('success', 'failed', 'blocked', 'suspicious')),
  failure_reason TEXT,
  is_trusted_device BOOLEAN DEFAULT FALSE,
  device_fingerprint TEXT,
  
  -- Timestamps
  login_at TIMESTAMPTZ DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for login_activity
CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON login_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_login_activity_login_at ON login_activity(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_active ON login_activity(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_login_activity_fingerprint ON login_activity(device_fingerprint);

-- =============================================
-- TRUSTED DEVICES TABLE
-- Store verified/trusted devices for 2FA bypass
-- =============================================
CREATE TABLE IF NOT EXISTS trusted_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  device_fingerprint TEXT NOT NULL,
  device_name VARCHAR(100),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  ip_address INET,
  
  trusted_at TIMESTAMPTZ DEFAULT NOW(),
  last_used TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, device_fingerprint)
);

-- Indexes for trusted_devices
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);

-- =============================================
-- ACCOUNT RECOVERY TABLE
-- Store recovery codes and requests
-- =============================================
CREATE TABLE IF NOT EXISTS account_recovery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  recovery_type VARCHAR(20) NOT NULL CHECK (recovery_type IN ('email', 'phone', 'backup_codes')),
  recovery_codes JSONB, -- Encrypted backup codes
  recovery_email TEXT,
  recovery_phone TEXT,
  
  -- Request tracking
  last_request_at TIMESTAMPTZ,
  request_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SETTINGS CHANGE LOG
-- Audit trail for settings changes
-- =============================================
CREATE TABLE IF NOT EXISTS settings_changelog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  setting_type VARCHAR(50) NOT NULL, -- 'profile', 'privacy', 'trading', 'security', 'notifications'
  setting_key VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  
  ip_address INET,
  user_agent TEXT,
  
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for settings_changelog
CREATE INDEX IF NOT EXISTS idx_settings_changelog_user_id ON settings_changelog(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_changelog_changed_at ON settings_changelog(changed_at DESC);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create default settings for new user
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user_settings
  INSERT INTO user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  
  -- Create trading_preferences
  INSERT INTO trading_preferences (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log settings changes
CREATE OR REPLACE FUNCTION log_settings_change()
RETURNS TRIGGER AS $$
DECLARE
  col_name TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- Loop through columns and log changes
  FOR col_name IN SELECT column_name FROM information_schema.columns 
    WHERE table_name = TG_TABLE_NAME AND column_name NOT IN ('id', 'user_id', 'created_at', 'updated_at')
  LOOP
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col_name, col_name)
    INTO old_val, new_val
    USING OLD, NEW;
    
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO settings_changelog (user_id, setting_type, setting_key, old_value, new_value)
      VALUES (NEW.user_id, TG_TABLE_NAME, col_name, old_val, new_val);
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-update timestamps
DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON user_settings;
CREATE TRIGGER trigger_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_trading_prefs_updated_at ON trading_preferences;
CREATE TRIGGER trigger_trading_prefs_updated_at
BEFORE UPDATE ON trading_preferences
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create default settings on new user
DROP TRIGGER IF EXISTS trigger_create_default_settings ON user_profiles;
CREATE TRIGGER trigger_create_default_settings
AFTER INSERT ON user_profiles
FOR EACH ROW EXECUTE FUNCTION create_default_user_settings();

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_recovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_changelog ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - user_settings
-- =============================================

DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
CREATE POLICY "Users can view own settings" ON user_settings
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
CREATE POLICY "Users can update own settings" ON user_settings
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
CREATE POLICY "Users can insert own settings" ON user_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - trading_preferences
-- =============================================

DROP POLICY IF EXISTS "Users can view own trading prefs" ON trading_preferences;
CREATE POLICY "Users can view own trading prefs" ON trading_preferences
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trading prefs" ON trading_preferences;
CREATE POLICY "Users can update own trading prefs" ON trading_preferences
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trading prefs" ON trading_preferences;
CREATE POLICY "Users can insert own trading prefs" ON trading_preferences
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - login_activity
-- =============================================

DROP POLICY IF EXISTS "Users can view own login activity" ON login_activity;
CREATE POLICY "Users can view own login activity" ON login_activity
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert login activity" ON login_activity;
CREATE POLICY "System can insert login activity" ON login_activity
FOR INSERT WITH CHECK (TRUE);

-- =============================================
-- RLS POLICIES - trusted_devices
-- =============================================

DROP POLICY IF EXISTS "Users can view own trusted devices" ON trusted_devices;
CREATE POLICY "Users can view own trusted devices" ON trusted_devices
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own trusted devices" ON trusted_devices;
CREATE POLICY "Users can manage own trusted devices" ON trusted_devices
FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES - settings_changelog
-- =============================================

DROP POLICY IF EXISTS "Users can view own settings history" ON settings_changelog;
CREATE POLICY "Users can view own settings history" ON settings_changelog
FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- SERVICE ROLE POLICIES (for backend)
-- These allow the service role to bypass RLS
-- =============================================

-- Add to user_profiles if not exists
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS status_message VARCHAR(200);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

-- Done!
SELECT 'Settings schema created successfully!' as status;
