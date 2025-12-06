# Admin Platform Setup Guide

## Current Status
✅ All code is complete and deployed
❌ Database tables don't exist yet (causing 500 errors)
❌ Admin access not enabled yet

## Step-by-Step Instructions

### 1. Create Database Tables

Open Supabase SQL Editor and run this migration:

**File: `/home/dzaddy/Documents/tradermind-server/sql/clean_trading_migration.sql`**

```bash
# Copy the entire file contents (all 369 lines) and paste into Supabase SQL Editor
# Then click "RUN"
```

This creates 8 tables:
- `trading_accounts` - Deriv account connections
- `trading_sessions` - Trading sessions (day/one-time/recovery)
- `session_invitations` - User invitations to sessions
- `trades` - Individual trade records
- `recovery_states` - Recovery session tracking
- `trading_activity_logs` - Audit logs
- `trading_notifications` - User notifications
- `strategy_performance` - Strategy analytics

### 2. Enable Admin Access

Run this SQL in Supabase SQL Editor:

```sql
-- Add is_admin column to user_profiles (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Set yourself as admin (replace with your deriv_id)
UPDATE user_profiles 
SET is_admin = true 
WHERE deriv_id = 'CR6550175';

-- Verify
SELECT deriv_id, name, email, is_admin 
FROM user_profiles 
WHERE deriv_id = 'CR6550175';
```

### 3. Refresh Your Session

1. **Hard refresh browser**: Press `Ctrl + Shift + R`
2. **Logout and login again** to refresh your session token
3. Navigate to Dashboard

### 4. Access Admin Platform

Once logged in as admin:

**Option 1: Click Trading Tab**
- Look for the ⚡ (Zap icon) tab in the dashboard
- Click it to open the Trading section

**Option 2: Keyboard Shortcut**
- Press `Ctrl + R` to quick-access Trading tab

You should now see the **Admin Control Panel** instead of the user dashboard.

## Admin Control Panel Features

### Create Trading Session
1. **Session Name**: Give it a descriptive name
2. **Session Type**: 
   - **Day** - High balance sessions with profit targets
   - **One-Time** - Quick single-session trades
   - **Recovery** - Post-stop-loss recovery sessions
3. **Strategy**: Choose from 8 strategies (DFPM, VCS, DER, TPC, DTP, DPB, MTD, RDS)
4. **Volatility Index**: R_10, R_25, R_50, R_75, R_100
5. **Contract Type**: DIGITEVEN, DIGITODD, DIGITMATCH, etc.
6. **Staking Mode**: Fixed, Martingale, or Compounding
7. **Stakes & Limits**: Initial stake, max stake, profit/loss thresholds

### Invite Users
1. Search for users by name or Deriv ID
2. Select accounts to invite
3. Users receive notifications and can join the session

### Bot Controls
- **Start Bot**: Begin automated trading
- **Stop Bot**: Halt all trading
- **Pause Session**: Temporarily pause without stopping

### Monitor Sessions
- Real-time trade execution
- Live P&L tracking
- User participation metrics
- Strategy performance analytics

## Verification Checklist

Run these SQL queries to verify setup:

```sql
-- 1. Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'trading_%'
ORDER BY table_name;

-- Expected output: 8 tables

-- 2. Check admin status
SELECT deriv_id, name, is_admin 
FROM user_profiles 
WHERE is_admin = true;

-- Should show your account

-- 3. Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename LIKE 'trading_%'
ORDER BY tablename;

-- Should show "Service role bypass" for each table
```

## Troubleshooting

### Still seeing 500 errors?
- Verify all 8 tables were created (run verification query above)
- Check backend logs on Railway
- Ensure service_role key is in Railway environment variables

### Not seeing Admin Control Panel?
- Verify `is_admin = true` in database
- Logout and login again
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors

### Deprecation warnings?
- Wait for Vercel rebuild to complete
- Hard refresh browser after rebuild
- These warnings are harmless and will disappear

## Next Steps After Setup

1. **Connect Deriv Account**: Add your Deriv API token
2. **Create Test Session**: Start with a small stake to test
3. **Invite Test Users**: Test the invitation system
4. **Monitor First Trades**: Verify tick streaming and trade execution
5. **Check Notifications**: Ensure WebSocket events work
6. **Review Analytics**: Check strategy performance tracking

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Railway logs for backend errors
3. Verify Supabase tables and RLS policies
4. Ensure all environment variables are set correctly
