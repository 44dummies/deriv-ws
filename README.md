# TraderMind - Automated Trading Platform

A comprehensive multi-account automated trading platform for Deriv with real-time bot management, session orchestration, and community features.

## 🚀 Live Site

https://tradermind.site

## 📋 Overview

TraderMind is a full-stack trading automation platform that enables administrators to create trading sessions, invite multiple user accounts, and execute automated trades across all participants using sophisticated trading strategies. The platform features real-time monitoring, analytics, and a community system for traders.

## ⚡ Key Features

### Trading Automation
- **Multi-Account Bot System** - Execute trades across multiple Deriv accounts simultaneously
- **Session Management** - Create day, one-time, or recovery trading sessions
- **Trading Strategies** - DFPM, VCS, DER, TPC, DTP, DPB, MTD, RDS
- **Real-Time Execution** - WebSocket-based trade execution with live monitoring
- **Recovery Mode** - Automated loss recovery with configurable thresholds

### Admin Dashboard  
- Bot control panel (start/stop/pause/resume)
- Session creation and management
- User account management
- Real-time analytics and statistics
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

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** - Responsive mobile-first design
- **Socket.IO Client** - Real-time updates
- **Zustand** - State management
- **React Router** - Navigation

### Backend
- **Node.js** with Express
- **Socket.IO** - WebSocket server
- **Supabase PostgreSQL** - Database
- **JWT** - Authentication
- **Deriv WebSocket API** - Trade execution

## 📁 Project Structure

```
/
├── src/                           # React frontend
│   ├── components/                # Reusable UI components
│   ├── pages/                     # Page components
│   │   ├── admin/                 # Admin dashboard pages
│   │   └── ...                    # User-facing pages
│   ├── services/                  # API clients
│   │   ├── apiClient.ts           # HTTP client
│   │   └── realtimeSocket.ts      # WebSocket client
│   ├── trading/                   # Trading system
│   │   ├── tradingApi.ts          # Trading HTTP API
│   │   └── hooks.tsx              # Trading hooks
│   └── store/                     # State management
├── server/                        # Express backend
│   ├── src/
│   │   ├── routes/                # API routes
│   │   │   ├── admin/             # Admin endpoints
│   │   │   ├── user/              # User endpoints
│   │   │   └── trading.js         # Trading endpoints
│   │   ├── services/              # Business logic
│   │   │   ├── trading.js         # Trading service
│   │   │   ├── botManager.js      # Bot orchestration
│   │   │   ├── sessionManager.js  # Session management
│   │   │   ├── tradeExecutor.js   # Trade execution
│   │   │   └── signalWorker.js    # Strategy signals
│   │   ├── db/                    # Database config
│   │   └── socket/                # WebSocket handlers
│   └── package.json
└── public/                        # Static assets
```

## 🔧 Environment Variables

### Frontend (.env)
```env
REACT_APP_DERIV_APP_ID=your_deriv_app_id
REACT_APP_SERVER_URL=https://your-backend-url
REACT_APP_WS_URL=wss://your-backend-url
```

### Backend (server/.env)
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
DERIV_APP_ID=your_deriv_app_id
CORS_ORIGIN=https://tradermind.site
```

## 🚀 Development

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

## 📦 Deployment

- **Frontend**: Vercel (auto-deploy from main branch)
- **Backend**: Railway (auto-deploy from main branch)
- **Database**: Supabase PostgreSQL
- **DNS**: Cloudflare

## 🤖 Trading Bot System

See [TRADING_BOT_ARCHITECTURE.md](./TRADING_BOT_ARCHITECTURE.md) for detailed documentation on:
- Bot engine architecture
- Trading strategies explained
- Session lifecycle
- Trade execution flow
- Recovery mechanisms

## 🎯 Tier System

Users are automatically assigned to chatrooms based on trading performance:
- **Beginner**: New traders
- **Intermediate**: 50+ trades, 45%+ win rate
- **Advanced**: 200+ trades, 55%+ win rate
- **Expert**: 500+ trades, 65%+ win rate
- **Master**: 1000+ trades, 80%+ win rate

## 📱 Mobile Responsiveness

The entire application is fully responsive with:
- Mobile-first Tailwind CSS design
- 17px base font size on mobile for readability
- Minimum 44px touch targets
- Responsive navigation and layouts
- No horizontal scrolling on any page

## 📄 License

MIT

## 🔗 Links

- [Live Site](https://tradermind.site)
- [Trading Bot Architecture](./TRADING_BOT_ARCHITECTURE.md)
- [Deriv API Docs](https://api.deriv.com)
