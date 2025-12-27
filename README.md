# TraderMind - Automated Trading Platform

A comprehensive multi-account automated trading platform for Deriv with real-time bot management, session orchestration, and community features.

## Live Site

https://tradermind.site

## Overview

TraderMind is a full-stack trading automation platform that enables administrators to create trading sessions, invite multiple user accounts, and execute automated trades across all participants using sophisticated trading strategies. The platform features real-time monitoring, analytics, and a community system for traders.

## Key Features

### Trading Automation
- **Multi-Account Bot System** - Execute trades across multiple Deriv accounts simultaneously
- **Session Management** - Create day, one-time, or recovery trading sessions
- **Risk Engine** - Daily loss limits, exposure control, automatic trade blocking
- **Real-Time Execution** - WebSocket-based trade execution with live monitoring
- **Session Auto-Stop** - Automatic session termination based on duration
- **Recovery Mode** - Automated loss recovery with configurable thresholds

### Admin Dashboard  
- Bot control panel (start/stop/pause/resume)
- Session creation and management
- Real-time trading dashboard
- User account management
- Activity logs
- Balance monitoring (aggregated across all users)

### User Features
- Deriv OAuth authentication
- Trading dashboard with TP/SL management
- Session participation system
- Real-time trade notifications
- Performance analytics
- Tier-based chatrooms
- Community feed

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** - Responsive mobile-first design
- **Socket.IO Client** - Real-time updates
- **Zustand** - State management
- **Recharts** - Trading charts

### Backend
- **Node.js** with Express
- **Socket.IO** - WebSocket server
- **Supabase PostgreSQL** - Database
- **PM2** - Process management
- **Deriv WebSocket API** - Trade execution

## Project Structure

```
/
├── src/                           # React frontend
│   ├── components/                # Reusable UI components
│   ├── pages/                     # Page components
│   │   ├── admin/                 # Admin dashboard pages
│   │   │   ├── TradingDashboard   # Real-time trading metrics
│   │   │   └── ...                
│   │   └── ...                    # User-facing pages
│   ├── services/                  # API clients
│   └── store/                     # State management
├── server/                        # Express backend
│   ├── src/
│   │   ├── routes/                # API routes
│   │   ├── services/              # Business logic
│   │   │   ├── botManager.js      # Bot orchestration
│   │   │   ├── tradeExecutor.js   # Trade execution
│   │   │   ├── signalWorker.js    # Strategy signals
│   │   │   ├── strategyEngine.js  # Signal generation
│   │   │   ├── tickCollector.js   # Market data
│   │   │   └── trading-engine/    # Risk management
│   │   │       └── risk/          # RiskEngine, Indicators
│   │   ├── db/                    # Database config
│   │   └── socket/                # WebSocket handlers
│   └── ecosystem.config.js        # PM2 configuration
└── public/                        # Static assets
```

## Environment Variables

### Frontend (.env)
```env
REACT_APP_DERIV_APP_ID=114042
REACT_APP_SERVER_URL=https://your-backend-url
REACT_APP_API_URL=https://your-backend-url
```

### Backend (server/.env)
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
DERIV_APP_ID=114042
DERIV_MASTER_TOKEN=your_master_token
CORS_ORIGIN=https://tradermind.site
SENTRY_DSN=optional_error_tracking
```

## Development

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Supabase account
- Deriv API app (register at api.deriv.com)

### Frontend Setup
```bash
npm install
npm start
```

### Backend Setup
```bash
cd server
npm install
npm run dev
```

### Production (PM2)
```bash
cd server
pm2 start ecosystem.config.js
pm2 logs tradermind-server
```

## Deployment

- **Frontend**: Vercel (auto-deploy from main branch)
- **Backend**: Railway (auto-deploy from main branch)
- **Database**: Supabase PostgreSQL
- **DNS**: Cloudflare

## Trading Bot System

See [TRADING_BOT_ARCHITECTURE.md](./TRADING_BOT_ARCHITECTURE.md) for detailed documentation on:
- Bot engine architecture
- Risk management system
- Session lifecycle
- Trade execution flow
- Recovery mechanisms

## Tier System

Users are automatically assigned to chatrooms based on trading performance:
- **Beginner**: New traders
- **Intermediate**: 50+ trades, 45%+ win rate
- **Advanced**: 200+ trades, 55%+ win rate
- **Expert**: 500+ trades, 65%+ win rate
- **Master**: 1000+ trades, 80%+ win rate

## Mobile Responsiveness

The entire application is fully responsive with:
- Mobile-first Tailwind CSS design
- 17px base font size on mobile for readability
- Minimum 44px touch targets
- Responsive navigation and layouts
- Collapsible sidebar on mobile

## License

MIT

## Links

- [Live Site](https://tradermind.site)
- [Trading Bot Architecture](./TRADING_BOT_ARCHITECTURE.md)
- [Deriv API Docs](https://api.deriv.com)
