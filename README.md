# TraderMind

TraderMind is a trading operations console for the Deriv platform. It provides session control, monitoring, and audit-ready reporting with role-based access.

![TraderMind Dashboard](frontend/public/tradermind-logo.png)

## Key Capabilities

- Session lifecycle management (create, start, pause, stop)
- Real-time monitoring via WebSockets
- Manual trade execution with risk checks
- Admin oversight (users, logs, commissions)

## Architecture

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query
- API Gateway: Node.js, Express, Socket.IO
- QuantEngine: Pure quantitative trading pipeline (Node.js)

## Installation & Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- Supabase project

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

## Security Notes

- Deriv tokens are stored encrypted on the server and never exposed to the client.
- Role-based access is enforced on the API for administrative endpoints.
- Run `pnpm audit --recursive` before deployments to check for vulnerabilities.

## License

Private and confidential.
