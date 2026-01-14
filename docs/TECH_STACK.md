# TraderMind Tech Stack Reference

## Locked Versions

### Frontend (`apps/frontend`)
| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.2.0 | UI Framework |
| react-dom | 18.2.0 | React DOM |
| zustand | 4.5.0 | State Management |
| recharts | 2.12.0 | Charting |
| socket.io-client | 4.7.4 | WebSocket Client |
| tailwindcss | 3.4.1 | CSS Framework |
| vite | 5.0.12 | Build Tool |
| typescript | 5.3.3 | Language |

### API Gateway (`apps/api-gateway`)
| Package | Version | Purpose |
|---------|---------|---------|
| express | 4.18.2 | HTTP Server |
| socket.io | 4.7.4 | WebSocket Server |
| jose | 5.2.0 | JWT/Encryption |
| ioredis | 5.3.2 | Redis Client |
| @supabase/supabase-js | 2.39.3 | Database |
| pino | 8.17.2 | Logger |
| cors | 2.8.5 | CORS Middleware |
| helmet | 7.1.0 | Security Headers |

### QuantEngine (`apps/quant-engine`)
| Package | Version | Purpose |
|---------|---------|---------|
| ws | 8.16.0 | Deriv WebSocket |
| ioredis | 5.3.2 | SessionRegistry |
| @supabase/supabase-js | 2.39.3 | Trade Storage |
| pino | 8.17.2 | Logger |
| eventemitter3 | 5.0.1 | Internal Events |
| uuid | 9.0.0 | ID Generation |

### Shared Packages
| Package | Version | Purpose |
|---------|---------|---------|
| zod | 3.22.4 | Schema Validation |
| typescript | 5.3.3 | Language |

## Engine Requirements
- Node.js: ≥20.0.0 LTS
- pnpm: ≥8.0.0
