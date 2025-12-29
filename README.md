# TraderMind

> Event-driven automated trading platform built on Deriv WebSocket API

## Overview

TraderMind is a server-side, multi-user trading platform with:
- **TraderMind Core** (Node.js) — execution, risk, sessions, security
- **Quant Intelligence Layer** (Python) — probabilistic ML inference only

**Non-negotiable:** Python provides insight, never control.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r run build

# Development mode
pnpm -r run dev

# Python AI Layer
cd apps/ai-layer
source venv/bin/activate
uvicorn src.main:app --reload

# Docker (all services)
docker-compose up
```

## Repository Structure

```
tradermind/
├── apps/
│   ├── frontend/          # React 18 + Vite + Tailwind
│   ├── api-gateway/       # Express + Socket.IO (port 3000)
│   ├── quant-engine/      # Signal generation + execution (port 3001)
│   └── ai-layer/          # Python FastAPI ML (port 8000)
├── packages/
│   ├── schemas/           # Zod schemas + validators
│   ├── shared-utils/      # Idempotency, hashing utilities
│   └── risk-rules/        # Risk validation logic
├── docs/
│   ├── ARCHITECTURE.md    # System diagrams
│   ├── TECH_STACK.md      # Locked versions
│   └── EDGE_CASES.md      # 35+ edge cases
└── docker-compose.yml
```

## Module Responsibilities

| Module | Responsibility | Port |
|--------|---------------|------|
| **frontend** | React UI, WebSocket client | 5173 |
| **api-gateway** | Auth, routing, WS proxy | 3000 |
| **quant-engine** | MarketData, signals, risk, execution | 3001 |
| **ai-layer** | ML inference (POST /infer) | 8000 |
| **schemas** | Shared types, Zod validation | — |
| **shared-utils** | Idempotency keys, hashing | — |
| **risk-rules** | Risk hierarchy validation | — |

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Zustand, Tailwind, Recharts, Socket.IO |
| **Backend** | Node 20, Express, Socket.IO, Redis, Supabase |
| **AI Layer** | Python 3.11, FastAPI, XGBoost, scikit-learn |
| **Infra** | Docker, Redis, PostgreSQL (Supabase) |

## API Endpoints

### API Gateway (port 3000)
- `GET /health` — Health check
- `GET /api/v1/status` — Server status
- WebSocket: `session:join`, `session:leave`

### AI Layer (port 8000)
- `GET /health` — Health check
- `POST /infer` — ML signal inference

## Schemas (packages/schemas)

| Schema | Fields |
|--------|--------|
| User | id, email, role, deriv_token_encrypted |
| Session | id, status, config_json, created_at |
| Participant | user_id, session_id, status, pnl |
| Signal | type, confidence, reason, market, timestamp |
| TradeResult | status, profit, metadata_json |

## WebSocket Events

| Event | Payload |
|-------|---------|
| SESSION_CREATED | { session } |
| SESSION_JOINED | { participant, session_id } |
| SIGNAL_EMITTED | { signal, session_id } |
| TRADE_EXECUTED | { trade, session_id, user_id } |
| RISK_APPROVED | { signal, session_id, approved_at } |
| SESSION_TERMINATED | { session_id, reason, terminated_at } |

## Commands

```bash
# Build
pnpm -r run build

# Run sanity check
cd packages/schemas && node dist/sanity-check.js

# Test AI Layer
curl -X POST http://localhost:8000/infer \
  -H "Content-Type: application/json" \
  -d '{"market":"R_100","features":{"rsi":28,"ema_fast":100,"ema_slow":102,"volatility":0.5,"momentum":-0.3},"strategy_version":"v1"}'
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System diagrams, data flow
- [Tech Stack](docs/TECH_STACK.md) — Locked versions
- [Edge Cases](docs/EDGE_CASES.md) — 35+ edge cases documented
- [Week 2 Plan](docs/WEEK_2_PLAN.md) — Auth, sessions, Redis

## License

UNLICENSED — Private
