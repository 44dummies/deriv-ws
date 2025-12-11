# Development Rules & Constraints

## Core Purpose

The system connects users to Deriv.com's WebSocket API through a secure backend.
Users configure trading settings, and the backend executes trades based on those settings.

> **CRITICAL**: The system does not guess, assume, or create trading rules on its own.
> All trading actions must come directly from user input.

## High-Level Architecture

```
Frontend → Backend → Deriv WebSocket API
```

| Component | Responsibility |
|-----------|----------------|
| Frontend | Collect user settings, display results |
| Backend | Manage auth, WS connections, risk rules, strategy logic |
| Deriv API | Execute trades |

**Frontend NEVER communicates directly with Deriv WS in production.**

---

## Required User Inputs

### A. Account Details
| Field | Type | Description |
|-------|------|-------------|
| `demo_token` | String | Demo account API token |
| `real_token` | String | Real account API token |
| `active_account` | "demo" \| "real" | Current active account |

⚠️ **No automatic account switching.**

### B. Trading Parameters
| Field | Type | Description |
|-------|------|-------------|
| `market` | String | e.g., "volatility_75" |
| `trade_type` | String | rise_fall, high_low, touch, etc. |
| `stake` | Number | Amount per trade |
| `duration` | String | Trade duration |
| `barriers` | Object? | If applicable |
| `strategy_name` | String | Strategy identifier |
| `strategy_settings` | Object | Custom strategy params |

### C. Risk Management Settings
| Field | Type | Description |
|-------|------|-------------|
| `take_profit` | Number? | Stop at profit ceiling |
| `stop_loss` | Number? | Stop at loss floor |
| `daily_loss_limit` | Number? | Max daily loss |
| `daily_profit_limit` | Number? | Max daily profit |
| `max_trades` | Number | Total trades allowed |
| `martingale_enabled` | Boolean | Allow martingale? |
| `martingale_multiplier` | Number | Stake multiplier |
| `max_stake_allowed` | Number? | Maximum stake limit |

---

## Core Behavior Rules

These rules are **MANDATORY** and must be implemented consistently:

### ✅ The bot MUST:
- Only trade using explicit user-provided settings
- Include unique ID for every WebSocket purchase (prevent duplication)
- Validate inputs, balance, payout limits, strategy compatibility
- Stop immediately when: TP hit, SL hit, max_trades reached, session invalid

### 🚫 The bot must NEVER:
- Switch real/demo accounts automatically
- Increase stake without instruction
- Continue past stop-loss or take-profit
- Exceed user-set daily limits

---

## Data Structure Requirements

All trading configs must use this structure:

```json
{
  "account": {
    "active": "demo",
    "demo_token": "",
    "real_token": ""
  },
  "trade": {
    "market": "",
    "trade_type": "",
    "stake": 0,
    "duration": "",
    "barrier": null,
    "strategy": "basic",
    "strategy_settings": {}
  },
  "risk": {
    "take_profit": null,
    "stop_loss": null,
    "max_trades": 0,
    "martingale_enabled": false,
    "martingale_multiplier": 1.0,
    "max_stake_allowed": null,
    "daily_loss_limit": null,
    "daily_profit_limit": null
  }
}
```

---

## Strategy Rules

Strategies are **modular and plug-in based**.

A strategy module must:
- ✅ Accept the full user configuration object
- ✅ Return trade instructions
- 🚫 Never override user settings
- 🚫 Never modify stake unless user allows (e.g., martingale enabled)

---

## Backend Responsibilities

| Area | Tasks |
|------|-------|
| **Connection** | Safe WS handling, reconnecting cleanly |
| **Auth** | Authorization using user tokens |
| **Security** | Rate limiting, no token exposure |
| **Execution** | Validate inputs, execute trades |
| **Monitoring** | Track profit/loss, enforce stop conditions |
| **Logging** | Log all actions for audit |

**Backend must NEVER expose API keys or sensitive data to frontend.**

---

## Frontend Responsibilities

The frontend should ONLY:
- ✅ Collect user input
- ✅ Display balance, trade results, logs
- ✅ Send configuration to backend
- ✅ Receive clean responses
- 🚫 Never handle WebSocket connection to Deriv in production

---

## Development Behavior

When generating code or explanations:
| Do | Don't |
|----|-------|
| Follow architecture exactly | Mix real/demo logic |
| Use secure coding practices | Make business decisions user hasn't defined |
| Explain assumptions before implementing | Generate signals autonomously |
| Return modular, scalable code | Bypass risk settings |
| Prefer TypeScript (Node.js) or Python | Expose tokens in frontend |

---

## NEVER Do List

| Action | Reason |
|--------|--------|
| 🚫 Auto-trade without full config | User must define all params |
| 🚫 Generate signals on own | AI doesn't trade autonomously |
| 🚫 Run strategies without explicit params | All settings from user |
| 🚫 Assume barriers, stake, or market | User must specify |
| 🚫 Send incomplete WS messages | Causes errors/unexpected behavior |
| 🚫 Bypass risk settings | User safety critical |
| 🚫 Expose tokens in frontend | Security breach |

---

## Stop Conditions

The bot must STOP IMMEDIATELY when:

1. `take_profit` reached
2. `stop_loss` reached  
3. `max_trades` reached
4. `daily_loss_limit` reached
5. `daily_profit_limit` reached
6. Session becomes invalid
7. User explicitly requests stop
8. Balance insufficient for next trade
