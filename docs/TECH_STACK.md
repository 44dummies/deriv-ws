# Technology Stack

## Core Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Runtime** | Node.js | >=20.0.0 | Server-side execution |
| **Language** | TypeScript | 5.3+ | Type safety & developer experience |
| **Package Manager** | pnpm | Latest | Workspace management |

## Frontend (`@tradermind/frontend`)

- **Framework**: React 18
- **Build Tool**: Vite 5
- **State Management**: Zustand 4.5
- **Data Fetching**: TanStack Query v5
- **Styling**: TailwindCSS 3.4 + Tailwind Merge
- **Icons**: Lucide React
- **Real-time**: Socket.IO Client 4.8
- **UI Components**: Radix UI primitives (via shadcn/ui patterns)

## Backend (`@tradermind/api-gateway`)

- **Server Framework**: Express 4
- **Real-time Server**: Socket.IO 4.7
- **Database Client**: Supabase JS 2.39
- **Cache Client**: IORedis 5.3
- **Validation**: Zod 3.22
- **Logging**: Winston / Morgan
- **Deriv API**: `ws` (Raw WebSocket for Deriv connection)

## Infrastructure & Services

- **Database**: Supabase (PostgreSQL 15+)
- **Cache**: Redis (Upstash or self-hosted)
- **Deployment**: Railway (Containerized) / Vercel (Frontend Static)
- **Monitoring**: Sentry (Error Tracking)

## Development Tools

- **Linting**: ESLint + Prettier
- **Testing**: Vitest (Unit), Cypress (E2E)
