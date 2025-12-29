# TraderMind API Reference

## API Gateway (port 3000)

### Health & Status

#### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "api-gateway"
}
```

#### GET /api/v1/status
Server status with timestamp.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## WebSocket Events

### Connection
```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000');
```

### Client → Server

#### session:join
Join a trading session room.
```json
{ "sessionId": "session-001" }
```

#### session:leave
Leave a trading session room.
```json
{ "sessionId": "session-001" }
```

### Server → Client

#### SESSION_CREATED
```json
{
  "type": "SESSION_CREATED",
  "payload": {
    "session": {
      "id": "session-001",
      "status": "PENDING",
      "config_json": { ... },
      "created_at": "2024-01-15T10:30:00Z"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### SESSION_JOINED
```json
{
  "type": "SESSION_JOINED",
  "payload": {
    "participant": {
      "user_id": "user-001",
      "session_id": "session-001",
      "status": "ACTIVE",
      "pnl": 0
    },
    "session_id": "session-001"
  },
  "timestamp": "2024-01-15T10:30:01Z"
}
```

#### SIGNAL_EMITTED
```json
{
  "type": "SIGNAL_EMITTED",
  "payload": {
    "signal": {
      "type": "CALL",
      "confidence": 0.85,
      "reason": "RSI_OVERSOLD",
      "market": "R_100",
      "timestamp": "2024-01-15T10:30:02Z"
    },
    "session_id": "session-001"
  },
  "timestamp": "2024-01-15T10:30:02Z"
}
```

#### TRADE_EXECUTED
```json
{
  "type": "TRADE_EXECUTED",
  "payload": {
    "trade": {
      "status": "WIN",
      "profit": 15.25,
      "metadata_json": { ... }
    },
    "session_id": "session-001",
    "user_id": "user-001"
  },
  "timestamp": "2024-01-15T10:30:03Z"
}
```

#### RISK_APPROVED
```json
{
  "type": "RISK_APPROVED",
  "payload": {
    "signal": { ... },
    "session_id": "session-001",
    "approved_at": "2024-01-15T10:30:04Z"
  },
  "timestamp": "2024-01-15T10:30:04Z"
}
```

#### SESSION_TERMINATED
```json
{
  "type": "SESSION_TERMINATED",
  "payload": {
    "session_id": "session-001",
    "reason": "ADMIN_TERMINATED",
    "terminated_at": "2024-01-15T11:00:00Z"
  },
  "timestamp": "2024-01-15T11:00:00Z"
}
```

---

## AI Layer (port 8000)

### Health

#### GET /health
```json
{
  "status": "healthy",
  "service": "ai-layer"
}
```

### Inference

#### POST /infer
ML signal inference endpoint.

**Request:**
```json
{
  "market": "R_100",
  "features": {
    "rsi": 28.1,
    "ema_fast": 102.3,
    "ema_slow": 104.7,
    "volatility": 0.61,
    "momentum": -0.42
  },
  "strategy_version": "mean_reversion_v1"
}
```

**Response:**
```json
{
  "signal_bias": "CALL",
  "confidence": 0.81,
  "regime": "RANGING",
  "model_version": "rule_based_v1.0",
  "reason": "RSI_OVERSOLD"
}
```

**Constraints:**
- Latency must be < 50ms
- Timeout at 100ms (signal dropped)
- No database access
- No token access
- Numeric features only
