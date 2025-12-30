# Repository Structure

This document outlines the organization of the TraderMind monorepo.

## Root Directory
| File/Folder | Description |
|-------------|-------------|
| `backend/` | Contains backend services source code. |
| `frontend/` | React frontend application (Vercel deployment root). |
| `packages/` | Internal shared libraries (npm workspaces). |
| `supabase/` | Database migrations and configuration. |
| `Dockerfile.*` | Service-specific Dockerfiles for Railway deployment. |
| `railway.toml` | Configuration for Railway builds. |
| `pnpm-workspace.yaml` | Monorepo configuration. |

---

## Backend (`backend/`)
| Service | Path | Description |
|---------|------|-------------|
| **API Gateway** | `api-gateway/` | Entry point. Handles WebSocket connections, Authentication, and REST routes. Connects to Redis and calls other services. |
| **Quant Engine** | `quant-engine/` | The core trading brain. Subscribes to market data, checks risk, generates signals, and executes trades. |
| **AI Layer** | `ai-layer/` | Python-based ML service. Exposes a simple HTTP API (`/infer`) for generating signal confidence based on features. |

## Frontend (`frontend/`)
Root for the Vercel deployment.
- `src/pages/`: Main views (Login, Dashboard, LiveSession).
- `src/services/`: API and WebSocket clients.
- `src/stores/`: Zustand state management (`useAuthStore`, `useSessionStore`).
- `vercel.json`: SPA routing configuration.

## Shared Packages (`packages/`)
| Package | Description |
|---------|-------------|
| `@tradermind/schemas` | Zod schemas for all domain entities (Users, Sessions, Trades, Signals). **Source of Truth**. |
| `@tradermind/risk-rules` | Independent risk validation logic. |
| `@tradermind/shared-utils` | Hashing, idempotency keys, and common helpers. |

## Infrastructure & Config
- **Docker**: Root `Dockerfile.api-gateway`, `Dockerfile.quant-engine`, `Dockerfile.ai-layer` are used for isolated builds.
- **Database**: Supabase (PostgreSQL). Migrations are tracked in `supabase/migrations`.
- **Cache**: Redis (used for session store and Pub/Sub).
