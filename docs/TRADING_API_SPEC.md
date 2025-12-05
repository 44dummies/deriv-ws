# Trading System Backend API Specification

This document describes the API endpoints required for the Multi-Account Automated Trading System.

## Base URL
`https://tradermind-server.up.railway.app/api/trading`

## Authentication
All endpoints require JWT authentication via Bearer token in Authorization header.

---

## Sessions API

### Create Session
**POST** `/sessions`

Create a new trading session.

```json
Request Body:
{
  "type": "day" | "one_time" | "recovery",
  "name": "string",
  "symbol": "R_100",
  "contractType": "DIGITEVEN" | "DIGITODD" | "CALL" | "PUT" | ...,
  "stakingMode": "fixed" | "martingale" | "compounding",
  "baseStake": 1.00,
  "martingaleMultiplier": 2.0,
  "maxMartingaleSteps": 5,
  "minimumBalance": 100.00,
  "inviteAccountIds": ["acc1", "acc2"]
}

Response:
{
  "success": true,
  "session": { ...TradingSession }
}
```

### Get Active Sessions
**GET** `/sessions/active`

```json
Response:
{
  "sessions": [TradingSession, ...]
}
```

### Get Session by ID
**GET** `/sessions/:sessionId`

### Start Session
**POST** `/sessions/:sessionId/start`

### Pause Session
**POST** `/sessions/:sessionId/pause`

### Resume Session
**POST** `/sessions/:sessionId/resume`

### Stop Session
**POST** `/sessions/:sessionId/stop`

### Force Direction Override
**POST** `/sessions/:sessionId/override`

```json
Request Body:
{
  "direction": "CALL" | "PUT",
  "reason": "string (optional)"
}
```

### Clear Override
**DELETE** `/sessions/:sessionId/override`

---

## Accounts API

### Register Account
**POST** `/accounts`

```json
Request Body:
{
  "loginId": "CR12345",
  "token": "oauth_token",
  "currency": "USD",
  "isVirtual": false
}

Response:
{
  "success": true,
  "account": { ...TradingAccount }
}
```

### Get All Accounts
**GET** `/accounts`

### Get Account by ID
**GET** `/accounts/:accountId`

### Update Account Settings
**PATCH** `/accounts/:accountId`

```json
Request Body:
{
  "takeProfit": 50.00,
  "stopLoss": 25.00
}
```

### Accept Session Invitation
**POST** `/accounts/:accountId/accept-session`

```json
Request Body:
{
  "sessionId": "uuid",
  "takeProfit": 50.00,
  "stopLoss": 25.00
}
```

### Leave Session
**POST** `/accounts/:accountId/leave-session`

```json
Request Body:
{
  "sessionId": "uuid"
}
```

### Delete Account
**DELETE** `/accounts/:accountId`

---

## Trades API

### Get Recent Trades
**GET** `/trades`

Query params:
- `limit`: number (default: 50)
- `sessionId`: string (optional)
- `accountId`: string (optional)

### Get Trade by ID
**GET** `/trades/:tradeId`

### Get Session Trade Stats
**GET** `/trades/stats/:sessionId`

```json
Response:
{
  "totalTrades": 100,
  "wins": 55,
  "losses": 45,
  "winRate": 55.0,
  "totalProfit": 150.00,
  "avgProfit": 1.50
}
```

---

## Invitations API

### Get Pending Invitations for Account
**GET** `/invitations/:accountId`

### Decline Invitation
**POST** `/invitations/:accountId/decline`

```json
Request Body:
{
  "sessionId": "uuid"
}
```

---

## Recovery API

### Get Recovery State
**GET** `/recovery/:accountId`

### Start Recovery
**POST** `/recovery/:accountId/start`

```json
Request Body:
{
  "lossAmount": 100.00
}
```

### End Recovery
**POST** `/recovery/:accountId/end`

---

## Notifications API

### Get Notifications
**GET** `/notifications`

Query params:
- `limit`: number (default: 50)
- `unreadOnly`: boolean (default: false)
- `accountId`: string (optional)

### Mark Notification as Read
**POST** `/notifications/:notificationId/read`

### Mark All as Read
**POST** `/notifications/read-all`

### Clear Notifications
**DELETE** `/notifications`

---

## System API

### Get System Status
**GET** `/system/status`

```json
Response:
{
  "isRunning": true,
  "systemStatus": "running",
  "uptime": 86400000,
  "totalTrades": 1500,
  "totalProfit": 2500.00,
  "activeSymbols": ["R_100", "R_50"],
  "activeSessions": 3,
  "activeAccounts": 10
}
```

### Start System
**POST** `/system/start`

### Stop System
**POST** `/system/stop`

### Get Activity Logs
**GET** `/system/logs`

Query params:
- `limit`: number (default: 100)
- `type`: string (optional)

---

## WebSocket Events

The backend should also emit WebSocket events for real-time updates:

### Client -> Server Events

```typescript
// Subscribe to session updates
{ type: 'subscribe_session', sessionId: string }

// Subscribe to account updates
{ type: 'subscribe_account', accountId: string }

// Subscribe to system events
{ type: 'subscribe_system' }
```

### Server -> Client Events

```typescript
// Session events
{ type: 'session_created', session: TradingSession }
{ type: 'session_updated', session: TradingSession }
{ type: 'session_started', session: TradingSession }
{ type: 'session_ended', session: TradingSession, reason: string }

// Trade events
{ type: 'trade_executed', trade: TradeExecution }
{ type: 'trade_settled', trade: TradeExecution }

// Account events
{ type: 'account_updated', account: TradingAccount }
{ type: 'tp_reached', account: TradingAccount }
{ type: 'sl_reached', account: TradingAccount }
{ type: 'recovery_started', accountId: string, lossAmount: number }
{ type: 'recovery_complete', accountId: string, recoveredAmount: number }

// System events
{ type: 'system_status', status: string }
{ type: 'tick', symbol: string, quote: number, digit: number }
{ type: 'signal', signal: AggregatedSignal }
```

---

## Database Schema (PostgreSQL)

### Tables

```sql
-- Trading Sessions
CREATE TABLE trading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  contract_type VARCHAR(50) NOT NULL,
  staking_mode VARCHAR(20) NOT NULL,
  base_stake DECIMAL(10,2) NOT NULL,
  martingale_multiplier DECIMAL(5,2) DEFAULT 2.0,
  max_martingale_steps INTEGER DEFAULT 5,
  minimum_balance DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  total_trades INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  total_profit DECIMAL(10,2) DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  manual_override_active BOOLEAN DEFAULT FALSE,
  forced_direction VARCHAR(10)
);

-- Trading Accounts
CREATE TABLE trading_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  login_id VARCHAR(50) NOT NULL UNIQUE,
  token TEXT NOT NULL,
  currency VARCHAR(10) NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0,
  is_virtual BOOLEAN DEFAULT FALSE,
  account_type VARCHAR(20) DEFAULT 'trading',
  take_profit DECIMAL(10,2) DEFAULT 50,
  stop_loss DECIMAL(10,2) DEFAULT 25,
  current_profit DECIMAL(10,2) DEFAULT 0,
  is_in_session BOOLEAN DEFAULT FALSE,
  session_id UUID REFERENCES trading_sessions(id),
  status VARCHAR(20) DEFAULT 'idle',
  last_trade_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Participants
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES trading_sessions(id) ON DELETE CASCADE,
  account_id UUID REFERENCES trading_accounts(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  take_profit DECIMAL(10,2),
  stop_loss DECIMAL(10,2),
  UNIQUE(session_id, account_id)
);

-- Session Invitations
CREATE TABLE session_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES trading_sessions(id) ON DELETE CASCADE,
  account_id UUID REFERENCES trading_accounts(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(session_id, account_id)
);

-- Trades
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES trading_sessions(id),
  account_id UUID REFERENCES trading_accounts(id),
  symbol VARCHAR(50) NOT NULL,
  contract_type VARCHAR(50) NOT NULL,
  stake DECIMAL(10,2) NOT NULL,
  barrier INTEGER,
  proposal_id VARCHAR(255),
  contract_id BIGINT,
  entry_price DECIMAL(20,8),
  entry_tick INTEGER,
  status VARCHAR(20) NOT NULL,
  outcome VARCHAR(20),
  payout DECIMAL(10,2) DEFAULT 0,
  profit DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  signal_data JSONB,
  martingale_step INTEGER DEFAULT 0
);

-- Recovery States
CREATE TABLE recovery_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES trading_accounts(id) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  loss_to_recover DECIMAL(10,2) NOT NULL,
  recovered_amount DECIMAL(10,2) DEFAULT 0,
  attempt_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  current_stake DECIMAL(10,2) DEFAULT 0
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE,
  account_id UUID REFERENCES trading_accounts(id),
  session_id UUID REFERENCES trading_sessions(id)
);

-- Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES trading_sessions(id),
  account_id UUID REFERENCES trading_accounts(id),
  trade_id UUID REFERENCES trades(id),
  action VARCHAR(50) NOT NULL,
  details TEXT,
  profit DECIMAL(10,2),
  balance DECIMAL(10,2)
);

-- Indexes
CREATE INDEX idx_trades_session ON trades(session_id);
CREATE INDEX idx_trades_account ON trades(account_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_notifications_account ON notifications(account_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_session_participants_session ON session_participants(session_id);
CREATE INDEX idx_activity_logs_session ON activity_logs(session_id);
```

---

## Implementation Notes

1. **Real-time Updates**: Use Socket.IO for WebSocket communication between frontend and backend.

2. **Tick Streaming**: The bot engine on the frontend streams ticks directly from Deriv WebSocket. Consider offloading this to the backend for true 24/7 operation.

3. **Multi-Account Trading**: Each account requires its own Deriv WebSocket connection. Manage connection pooling carefully.

4. **Rate Limiting**: Deriv API has rate limits. Implement proper throttling and queuing.

5. **Error Handling**: Implement retry logic for transient failures and proper error propagation.

6. **Security**: 
   - Store OAuth tokens securely (encrypted at rest)
   - Implement request validation and sanitization
   - Use RLS policies in Supabase for data access control

7. **Monitoring**: Implement logging and monitoring for:
   - Trade execution latency
   - WebSocket connection health
   - Strategy performance metrics
   - Error rates and types
