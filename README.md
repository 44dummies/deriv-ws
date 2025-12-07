# TraderMind

A trading community platform for Deriv traders with real-time chat, analytics, and social features.

## Live Site

https://tradermind.site

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Socket.IO client for real-time features
- Zustand for state management

### Backend
- Node.js with Express
- Socket.IO for WebSocket communication
- Supabase PostgreSQL database
- JWT authentication

## Features

- Deriv OAuth authentication
- Real-time tier-based chatrooms
- Community feed with posts and comments
- Trading portfolio tracking
- Analytics dashboard
- Leaderboard system
- Achievement system
- AI trading mentor
- User profiles with avatars
- Settings management

## Project Structure

```
/
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── pages/              # Page components
│   ├── services/           # API and WebSocket services
│   └── store/              # State management
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── db/             # Database config
│   │   └── socket/         # WebSocket handlers
│   └── package.json
└── public/                 # Static assets
```

## Environment Variables

### Frontend (.env)
```
REACT_APP_DERIV_APP_ID=your_deriv_app_id
REACT_APP_API_URL=https://your-backend-url
REACT_APP_WS_URL=wss://your-backend-url
```

### Backend (server/.env)
```
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
JWT_SECRET=your_jwt_secret
DERIV_APP_ID=your_deriv_app_id
CORS_ORIGIN=https://tradermind.site
```

## Development

### Frontend
```bash
npm install
npm start
```

### Backend
```bash
cd server
npm install
npm run dev
```

## Deployment

- Frontend: Vercel (auto-deploy from main branch)
- Backend: Railway (auto-deploy from main branch)
- Database: Supabase PostgreSQL

## Tier System

Users are automatically assigned to chatrooms based on their trading performance:
- Beginner: New traders
- Intermediate: 50+ trades, 45%+ win rate
- Advanced: 200+ trades, 55%+ win rate
- Expert: 500+ trades, 65%+ win rate
- Master: 1000+ trades, 80%+ win rate

## License

MIT
