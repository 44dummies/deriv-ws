# TraderMind Repository Structure & Contents

## Overview
TraderMind is an event-driven automated trading platform built with a monorepo architecture using `pnpm` workspaces. It integrates multiple services for signal generation, risk management, and order execution, with a strong emphasis on AI-driven governance and safety.

## Root Directory Structure
- `.agent/`: Internal agent workflows and task management.
- `apps/`: Main service applications.
- `docs/`: Technical documentation (Architecture, API Reference, Edge Cases, etc.).
- `packages/`: Shared libraries and utilities used across apps.
- `supabase/`: Database schema, migrations, and local development configurations.
- `tests/`: System-level and E2E tests.
- `docker-compose.yml`: Local orchestration for the entire stack.
- `package.json`: Root manifest with workspace scripts.
- `pnpm-workspace.yaml`: Workspace configuration.

---

## Apps Breakdown (`/apps`)

### 1. `api-gateway`
- **Role**: Central orchestrator and API endpoint for the platform.
- **Tech**: Node.js, TypeScript, Express, Socket.IO.
- **Contents**:
  - `src/services/`: Core business logic (QuantEngine, RiskExecution, SessionManager).
  - `src/routes/`: REST endpoints for sessions, signals, and administrative controls.
  - `src/utils/`: Shared logic for encryption, database access, and type definitions.

### 2. `ai-layer`
- **Role**: Deterministic AI inference and model management.
- **Tech**: Python, FastAPI, Scikit-learn/XGBoost.
- **Contents**:
  - `main.py`: Entry point for the inference API.
  - `src/model_service.py`: Logic for loading and executing AI specific models.
  - `scripts/`: Safety governance tools (drift detection, kill switches, threshold management).

### 3. `frontend`
- **Role**: Real-time administrative and user dashboard.
- **Tech**: React, TypeScript, Zustand, Tailwind CSS, Vite.
- **Contents**:
  - `src/components/`: Reusable UI elements and charts.
  - `src/stores/`: Zustand state management for sessions, signals, and auth.
  - `src/pages/`: Main views (Dashboard, Session Summary, Admin).

### 4. `quant-engine`
- **Role**: High-performance indicator calculation and signal generation.
- **Tech**: TypeScript/Node.js.
- **Contents**: Core math and logic for RSI, EMA, and Volatility calculations.

---

## Packages Breakdown (`/packages`)

- `schemas/`: Shared Zod and JSON schemas for events and API payloads.
- `risk-rules/`: Centralized business rules for trade validation and drawdown limits.
- `shared-utils/`: Common logging, retry logic, and standard formatting tools.

---

## Database & Data Layer (`/supabase`)

- `migrations/`: Versioned SQL files for table definitions (signals, trades, sessions, thresholds).
- `config.toml`: Local Supabase development configuration.

---

## Documentation (`/docs`)

- `ARCHITECTURE.md`: High-level system design and data flow diagrams.
- `API_REFERENCE.md`: Detailed documentation for REST and WebSocket interfaces.
- `EDGE_CASES.md`: Known system limits and failure recovery protocols.
- `TECH_STACK.md`: Full list of languages, frameworks, and tools used.

---

## Technical Stack Summary
- **Backend Languages**: TypeScript (Node.js), Python (FastAPI).
- **Frontend**: React (Vite).
- **Databases**: PostgreSQL (Supabase), Redis (Session Caching).
- **Communication**: REST, WebSockets (Socket.IO).
- **Infrastructure**: Docker, Nginx (Frontend serve).
- **Governance**: Automated drift/decay detection, manual and AI-triggered kill switches.
