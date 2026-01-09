# TraderMind

TraderMind is a trading operations console for the Deriv platform. It provides session control, monitoring, and audit-ready reporting with role-based access.

![TraderMind Dashboard](frontend/public/tradermind-logo.png)

## Key Capabilities

- Session lifecycle management (create, start, pause, stop)
- Real-time monitoring via WebSockets
- Manual trade execution with risk checks
- Admin oversight (users, logs, commissions)
- Optional AI layer for analysis-only responses (disabled by default)

## Architecture

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query
- API Gateway: Node.js, Express, Socket.IO
- Optional AI Layer: Python, FastAPI (enable with `ENABLE_AI_LAYER=true`)

## Installation & Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase project
- (Optional) Python 3.10+ for the AI layer

### 1. Configure environment

Copy `.env.example` to `.env` and fill in required values.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Build and run

```bash
pnpm -r run build
pnpm -r run dev
```

### 4. Optional AI layer

```bash
cd backend/ai-layer
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 main.py
```

Set `ENABLE_AI_LAYER=true` and `AI_LAYER_URL` in `.env` to enable the chat proxy and health checks.

## Security Notes

- Deriv tokens are stored encrypted on the server and never exposed to the client.
- Role-based access is enforced on the API for administrative endpoints.
- The AI layer does not execute trades and is disabled unless explicitly enabled.

## License

Private and confidential.
