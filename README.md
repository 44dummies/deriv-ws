# TraderMind

> Event-driven automated trading platform built on Deriv WebSocket API.

## Overview

TraderMind is a server-side, multi-user trading platform featuring:
- **Core Execution Engine** (Node.js/TypeScript): Handles trade execution, risk management, and session orchestration.
- **Quant Intelligence Layer** (Python): Provides probabilistic ML inference (Insight only, never control).
- **Real-Time UI** (React): WebSocket-driven dashboard for live monitoring and control.

**Philosophy:** Python provides the brains (insight), Node.js provides the muscle (execution).

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- pnpm
- Python 3.10+
- Docker (optional, for local DB/Redis)

### Installation
```bash
# 1. Install dependencies
pnpm install

# 2. Environment Setup
cp .env.example .env

# 3. Start Infrastructure (Redis + Supabase/Postgres)
docker compose up -d redis

# 4. Run Development Servers
pnpm -r run dev
```

---

## Deployment

- **Backend**: Deployed on **Railway** (Dockerized).
- **Frontend**: Deployed on **Vercel**.
- **Database**: **Supabase** (PostgreSQL).

👉 **See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production guides.**

---

## Repository Structure

```
tradermind/
├── .agent/            # Agent workflows
├── backend/
│   ├── api-gateway/   # Express + Socket.IO (Entry point)
│   ├── quant-engine/  # Signal generation & execution logic
│   └── ai-layer/      # Python FastAPI (ML Inference)
├── frontend/          # React + Vite + Tailwind (Vercel Root)
├── packages/
│   ├── schemas/       # Shared Zod schemas & types
│   ├── shared-utils/  # Common utilities
│   └── risk-rules/    # Risk validation logic
├── supabase/          # Database migrations & config
├── docker-compose.yml # Local development orchestration
├── railway.toml       # Railway deployment config
└── Dockerfile.*       # Production Dockerfiles
```

---

## Architecture details

| Module | Responsibility | Port (Local) |
|--------|---------------|--------------|
| **Frontend** | UI, WebSocket Client | 5173 |
| **API Gateway** | Auth, WS Proxy, Rate Limiting | 3000 |
| **Quant Engine** | Market Data, Signals, Execution | 3001 |
| **AI Layer** | ML Inference (XGBoost/Scikit) | 8000 |

## License
UNLICENSED — Private
