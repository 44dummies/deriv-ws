# Mesoflix (Deriv OAuth + WebSocket demo)

This repository demonstrates a small Next.js app that authenticates users via Deriv OAuth and manages Deriv accounts over the Deriv WebSocket API.

What I changed/installed:
- Added `DERIV_API.md` with integration notes and examples for OAuth and WebSocket usage.
- Removed project `v0` traces from metadata and `package.json`.
- Added this `README.md` and a `.env.example` for environment config.

Quick start (local):

1. Copy the example env file and set your Deriv `app_id` and session secret:

```bash
cp .env.example .env.local
# then edit .env.local and set NEXT_PUBLIC_DERIV_APP_ID
# and set SESSION_SECRET (used to encrypt server-side sessions)
```

2. Install dependencies (this project uses pnpm by default if present):

```bash
# using pnpm
pnpm install
# or using npm
npm install
```

3. Run the dev server:

```bash
pnpm dev
# or
npm run dev
```

4. Open `http://localhost:3000` and click "Login with Deriv". You must register your app with Deriv and add `http://localhost:3000/callback` as the allowed `redirect_uri`.

Files to review for integration:
- `DERIV_API.md` — integration guide and checklist.
- `app/login/page.tsx` — builds the OAuth URL used to start login.
- `app/callback/page.tsx` — callback page; parse the redirect and persist tokens (if not implemented yet, see `DERIV_API.md`).
- `lib/websocket-manager.ts` — WebSocket manager; set `APP_ID` via `NEXT_PUBLIC_DERIV_APP_ID` as described in `DERIV_API.md`.
- `lib/token-manager.ts` — client-side token storage helpers.

Security note:
Storing tokens in `localStorage` has XSS risks. For production, consider a server-backed session or secure HttpOnly cookies.

If you'd like, I can:
- Wire `lib/websocket-manager.ts` to read `APP_ID` from `process.env.NEXT_PUBLIC_DERIV_APP_ID`.
- Implement `/callback` to parse and persist tokens automatically.
- Add a small test script demonstrating the WebSocket authorize flow.

