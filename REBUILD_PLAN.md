# DERIV MULTI-ACCOUNT TRADING SYSTEM - REBUILD PLAN

## CURRENT STATE vs REQUIRED STATE

### ❌ CURRENT ISSUES:
1. **TypeScript files exist** (App.tsx, config.ts, index.tsx) - Must be pure JS
2. **Dashboard.js** is a mixed dashboard - Should NOT exist for users
3. **No proper role separation** - Admin and User share components
4. **Backend incomplete** - Missing full bot engine, tick collector, analysis engine
5. **No strategy implementation** - DFPM, VCS, DER, etc. not coded
6. **No WebSocket tick streaming** - Only auth WebSocket exists
7. **No multi-account executor** - Trade execution not implemented
8. **Session system incomplete** - Day/One-Time/Recovery logic missing
9. **No notification system** - Real-time notifications not implemented
10. **No logging/analytics** - Comprehensive logging missing

---

## 🎯 REQUIRED SYSTEM ARCHITECTURE

### BACKEND STRUCTURE
```
/server
  /routes
    /admin
      - sessions.js (CRUD sessions, start/stop bot)
      - accounts.js (manage all accounts)
      - notifications.js (send broadcasts)
      - stats.js (full analytics)
      - logs.js (view all logs)
    /user
      - dashboard.js (get balance, status)
      - tpsl.js (update TP/SL)
      - sessions.js (accept session)
      - notifications.js (user notifications)
      - stats.js (personal stats only)
  /middleware
    - auth.js (JWT verification)
    - isAdmin.js (admin-only routes)
    - isUser.js (user-only routes)
  /services
    - tickCollector.js (WebSocket tick streaming)
    - analysisEngine.js (8 strategies from strategy files)
    - tradeExecutor.js (multi-account synchronized trading)
    - sessionManager.js (Day/OneTime/Recovery sessions)
    - notificationService.js (real-time + DB notifications)
    - security.js (AES-256-GCM token encryption)
    - logger.js (comprehensive logging)
  /db
    - schema.sql (all tables)
    - supabase.js (connection)
  /strategies
    - strategy1.txt (DFPM, VCS, DER, TPC)
    - strategy2.txt (DTP, DPB, MTD, RDS)
  index.js (main server)
```

### FRONTEND STRUCTURE
```
/src
  /pages
    /admin
      - AdminDashboard.js (main admin view)
      - Sessions.js (create/manage sessions)
      - BotControl.js (start/stop/override)
      - Notifications.js (broadcast system)
      - Stats.js (full analytics)
      - Logs.js (all system logs)
    /user
      - UserDashboard.js (ONLY: balance, TP, SL, accept, status)
      - Notifications.js (user notifications)
      - Stats.js (personal stats only)
    /auth
      - Login.js (Deriv OAuth)
      - Callback.js (handle OAuth + role redirect)
  /components
    /admin
      - SessionForm.js
      - BotControls.js
      - AccountList.js
      - AnalyticsCharts.js
    /user
      - TPSLForm.js
      - SessionStatus.js
      - NotificationPanel.js
  App.js (pure JS, NOT tsx)
  index.js (pure JS, NOT tsx)
```

---

## 📋 REQUIRED FUNCTIONALITY

### 1. ROLE SYSTEM
- [x] `is_admin` column exists in database
- [ ] JWT includes `role: "admin" | "user"`
- [ ] Backend middleware: `isAdmin()`, `isUser()`
- [ ] All `/admin/*` routes protected
- [ ] All `/user/*` routes protected
- [ ] Login redirects based on role

### 2. TICK STREAMING & ANALYSIS
- [ ] WebSocket connection to Deriv tick stream
- [ ] Subscribe to multiple markets (R_10, R_25, R_50, R_75, R_100)
- [ ] Store last 100 ticks per market
- [ ] Extract last digit from each tick
- [ ] Build digit frequency map
- [ ] Implement 8 strategies:
  - [ ] DFPM (Digit Frequency Probability Map)
  - [ ] VCS (Volatility Confidence System)
  - [ ] DER (Digit Exhaustion Rule)
  - [ ] TPC (Trend Probability)
  - [ ] DTP (Digit Trend Prediction)
  - [ ] DPB (Digit Probability Bias)
  - [ ] MTD (Multi-Timeframe Digit Trend)
  - [ ] RDS (Reversal Digit Strategy)
- [ ] Calculate Confidence Index (0-1)
- [ ] Generate trade signals (shouldTrade, side, digit, confidence, reason)
- [ ] Smart delay (revalidate 1 tick after signal)

### 3. SESSION SYSTEM
- [ ] Three session types:
  - [ ] Day Session (high min balance, long duration)
  - [ ] One-Time Session (low min balance, single run)
  - [ ] Recovery Session (SL-hit accounts only)
- [ ] Admin creates sessions with:
  - [ ] Session type
  - [ ] Minimum balance requirement
  - [ ] Default TP/SL
  - [ ] Markets to trade
  - [ ] Duration
- [ ] Users accept sessions (opt-in)
- [ ] Balance validation before trading
- [ ] Auto-remove on TP/SL hit

### 4. MULTI-ACCOUNT TRADE EXECUTION
- [ ] Fetch all accepted accounts for active session
- [ ] Validate balance >= session minimum
- [ ] Notify low-balance users (don't trade them)
- [ ] Execute SAME trade for all valid accounts:
  - [ ] Same market
  - [ ] Same contract type
  - [ ] Same barrier
  - [ ] Same timestamp
- [ ] Apply individual TP/SL per account
- [ ] Monitor each trade independently
- [ ] Close trades at TP/SL levels
- [ ] Update logs for each trade
- [ ] Remove account from session on TP/SL hit

### 5. TP/SL LOGIC
- [ ] Users set personal TP/SL
- [ ] Validate against admin minimums
- [ ] Monitor trade P&L in real-time
- [ ] When TP hit:
  - [ ] Close trade
  - [ ] Notify user
  - [ ] Remove from session
  - [ ] Log event
- [ ] When SL hit:
  - [ ] Close trade
  - [ ] Notify user
  - [ ] Remove from session
  - [ ] Flag for recovery session
  - [ ] Log event

### 6. BOT ENGINE
- [ ] Admin starts bot
- [ ] Bot runs continuously until stopped
- [ ] Main loop:
  1. [ ] Wait for signal from analysis engine
  2. [ ] Get active session
  3. [ ] Get accepted accounts
  4. [ ] Execute trades
  5. [ ] Monitor trades
  6. [ ] Handle TP/SL
  7. [ ] Update stats
  8. [ ] Repeat
- [ ] Manual override (emergency stop)
- [ ] Auto-pause on tick stream disconnect
- [ ] Rate limiting for Deriv API

### 7. NOTIFICATION SYSTEM
- [ ] Real-time notifications via Socket.IO
- [ ] Store in database for history
- [ ] Notification types:
  - [ ] Low balance warning
  - [ ] TP hit
  - [ ] SL hit
  - [ ] Session invite
  - [ ] Recovery session invite
  - [ ] Admin broadcast
  - [ ] Trade executed
  - [ ] Trade failed
- [ ] Admin can send broadcasts
- [ ] User sees only their notifications

### 8. ADMIN DASHBOARD
- [ ] Full session management (CRUD)
- [ ] Bot controls (start/stop/override)
- [ ] View all accounts
- [ ] Send notifications
- [ ] Full analytics:
  - [ ] Win/loss rate
  - [ ] P&L charts
  - [ ] Per-account performance
  - [ ] Per-market stats
- [ ] View all logs
- [ ] Account management

### 9. USER DASHBOARD
**ONLY shows:**
- [ ] Account balance
- [ ] TP input field
- [ ] SL input field
- [ ] "Accept Trading Session" button
- [ ] Session status (active/removed/TP hit/SL hit)
- [ ] Personal notifications
- [ ] Personal mini stats (trades, P&L)

**NEVER shows:**
- ❌ Bot controls
- ❌ Admin menus
- ❌ Full analytics
- ❌ Logs
- ❌ Account lists
- ❌ Markets
- ❌ Strategy details
- ❌ Session management

### 10. SECURITY
- [ ] AES-256-GCM encryption for Deriv API tokens
- [ ] JWT authentication
- [ ] Role-based access control
- [ ] Manual override to stop all trading
- [ ] Auto-pause on errors
- [ ] API rate limiting
- [ ] Error thresholds & safety shutdown

### 11. LOGGING & ANALYTICS
- [ ] Log everything:
  - [ ] All tick data
  - [ ] Every signal generated
  - [ ] Every trade placed
  - [ ] Trade results
  - [ ] TP/SL triggers
  - [ ] Account removals
  - [ ] Bot start/stop events
  - [ ] Recovery session activity
  - [ ] Errors
- [ ] Admin analytics dashboard
- [ ] User personal stats only

### 12. CONVERT TO PURE JAVASCRIPT
- [ ] Rename App.tsx → App.js
- [ ] Rename index.tsx → index.js
- [ ] Rename config.ts → config.js
- [ ] Remove all TypeScript types
- [ ] Remove all TSX syntax
- [ ] Update package.json (remove TypeScript deps)
- [ ] Update build config

---

## 🚀 IMPLEMENTATION PRIORITY

### Phase 1: Core Infrastructure (CRITICAL)
1. Convert TypeScript to JavaScript
2. Set up role middleware (isAdmin, isUser)
3. Create proper route separation (/admin/*, /user/*)
4. Update Callback.js for role-based redirect

### Phase 2: Backend Trading Engine
1. Tick collector (WebSocket streaming)
2. Analysis engine (8 strategies)
3. Trade executor (multi-account)
4. Session manager (Day/OneTime/Recovery)
5. Notification service
6. Logger

### Phase 3: Admin Dashboard
1. Session management UI
2. Bot control UI
3. Account management
4. Notifications UI
5. Analytics UI
6. Logs UI

### Phase 4: User Dashboard
1. Simple TP/SL form
2. Accept session button
3. Status display
4. Notifications
5. Personal stats

### Phase 5: Testing & Deployment
1. Test admin flow
2. Test user flow
3. Test multi-account execution
4. Test TP/SL logic
5. Deploy to production

---

## ⚠️ CRITICAL NOTES

**The current codebase does NOT match the requirements.**

To build this properly, we need to:

1. **Remove TypeScript completely** - Convert all `.tsx` and `.ts` files to `.js`
2. **Rebuild dashboards** - Separate admin and user completely
3. **Build backend engine** - Tick streaming, strategies, trade execution
4. **Implement session system** - Day/OneTime/Recovery logic
5. **Build notification system** - Real-time + DB
6. **Add comprehensive logging** - All events tracked

This is a **major rebuild**, not a small fix.

---

## ❓ NEXT STEPS

**Do you want me to:**

A. **Start the complete rebuild** from scratch (recommended)
B. **Convert existing TypeScript to JavaScript** first, then add missing features
C. **Focus on specific components** (which ones?)

Please confirm and I'll proceed accordingly.
