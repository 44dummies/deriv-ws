# Deriv API — Integration Notes

This document collects the minimal information and examples the app needs to integrate with Deriv's OAuth and WebSocket APIs. Add or adapt these notes where appropriate in the codebase (`lib/websocket-manager.ts`, `lib/token-manager.ts`, and login flow).

## Overview

- Purpose: Allow users to authenticate via Deriv OAuth and manage accounts via the Deriv WebSocket API.
- Key pieces you must configure:
  - `app_id` (OAuth / WebSocket application id)
  - `redirect_uri` (OAuth callback URL registered in your Deriv app settings)

## Obtain `app_id` and register `redirect_uri`

1. Create an application on Deriv's developer portal (or the relevant place Deriv provides for registering apps).
2. Set the allowed `redirect_uri` to `https://<your-host>/callback` (or `http://localhost:3000/callback` for local testing) in the app configuration.
3. Copy the provided `app_id` and keep it available for the client and WebSocket usage.

Notes:
- The `redirect_uri` you register on the Deriv side must exactly match the redirect used by the login flow.
- For production, use an HTTPS redirect.

## OAuth login flow (frontend)

- Login button should redirect users to the Deriv authorization endpoint with `app_id` and `redirect_uri`:

  `https://oauth.deriv.com/oauth2/authorize?app_id=<APP_ID>&redirect_uri=<REDIRECT_URI>`

- After the user authenticates, Deriv will redirect the browser to your `redirect_uri` with query parameters (or a fragment) containing the authorization result.
- Capture the authorization token or code from the callback page and persist it (see Token storage section).

## Token storage (client-side)

- This project already includes `lib/token-manager.ts` for saving tokens to `localStorage` under the key `deriv_tokens`.
- Minimal expectations:
  - Save an object that at least contains a `token` string per account.
  - Provide a way to clear tokens (logout) and list available tokens.

Security note: Storing long-lived tokens in `localStorage` has XSS risk. Limit token lifetime and consider more secure server-backed storage for production.

## WebSocket connection and authorize

- WebSocket URL (used in `lib/websocket-manager.ts`):

  `wss://ws.derivws.com/websockets/v3?app_id=<APP_ID>`

- After opening the WebSocket, you must send an authorize message with the user's token. In this codebase we call:

  `send({ authorize: '<TOKEN>' })`

- Example message flow:
  - Connect
  - send({ authorize: "<token>" })
  - On successful authorize, Deriv returns account details (see the `WebSocketResponse` types in `lib/websocket-manager.ts`).

- Example balance request (matches helper in `lib/websocket-manager.ts`):

  `send({ balance: 1, account: '<LOGINID>' })`

- For other requests (e.g., subscribe, buy/sell), consult Deriv's official WebSocket API docs for exact request/response formats.

## New helpers added in this repo

- `request(message, timeout)`: send a WebSocket request and await the response (uses an internal `req_id`).
- `getActiveSymbols(product_type)`: fetch brief active symbols via request.
- `subscribeTicks(symbol)`: subscribe to ticks for a symbol (use `addEventListener('message', handler)` to receive tick messages).
- `propose(payload)`: wrapper around `request` to send proposal payloads. Example payload fields: `symbol`, `contract_type`, `amount`, `duration`, `duration_unit`.
- `buy(payload)`: wrapper around `request` to perform a buy request; accepts an object with fields like `proposal_id` and `price`, or a proposal description.

These helpers are implemented in `lib/websocket-manager.ts` and are used by the UI components `components/ui/trade-panel.tsx` and `components/ui/tick-watcher.tsx`.

## Server-side OAuth code exchange

An API route has been scaffolded at `POST /api/auth/exchange` to exchange an OAuth `code` for tokens.

Environment variables supported:
- `DERIV_TOKEN_URL` (optional) — token endpoint override, default `https://oauth.deriv.com/oauth2/token`
- `DERIV_CLIENT_ID` — client id (if missing, `NEXT_PUBLIC_DERIV_APP_ID` is used)
- `DERIV_CLIENT_SECRET` (optional) — client secret if required
- `DERIV_REDIRECT_URI` (optional) — the redirect URI used in authorization

The endpoint forwards the provider response to the client. This repo now persists tokens server-side in a simple file-based store and sets an HttpOnly session cookie. See `app/api/auth/exchange` and `lib/server/session.ts`.

Security and operation notes:
- The session store is file-based under `data/sessions/` (suitable for demos and local dev). For production, use a proper secure store (database, encrypted KVS).
- The cookie name is `mesoflix_session` by default; override with `SESSION_COOKIE_NAME`.
- Cookie attributes: `HttpOnly`, `SameSite=Lax`, `Secure` is set when `NODE_ENV=production`.
- Logout route: POST `/api/auth/logout` deletes the server session and clears the cookie.

## Where to configure `APP_ID` in this project

- `lib/websocket-manager.ts` currently sets `const APP_ID = "114042"` near the top. Replace this value with your app id or modify the file to read from an environment variable at build/runtime.

  Example (Next.js runtime environment):
  - Add `NEXT_PUBLIC_DERIV_APP_ID` to your environment config (.env.local, deployment settings).
  - Replace the constant with `process.env.NEXT_PUBLIC_DERIV_APP_ID` (ensuring the value is available on the client).

## Callback page

- The `/callback` route should parse the redirect params (token or code) and store them using `saveTokens` from `lib/token-manager.ts`.
- After saving, redirect the user to the dashboard where the WebSocket manager can authorize using the stored token.

## Minimal checklist to get a working local flow

- [ ] Register app with Deriv and copy `app_id`.
- [ ] Add `redirect_uri` pointing to `/callback` in your Deriv app settings.
- [ ] Update `lib/websocket-manager.ts` to use your `app_id` or an environment variable.
- [ ] Ensure `/callback` route extracts the token and calls `saveTokens(...)`.
- [ ] On dashboard load, call `connect()` from `lib/websocket-manager.ts`, then call `authorize(token)` with the saved token.
- [ ] Handle WebSocket `message` events to populate account list and balances.

## References

- Deriv OAuth endpoint used by this project: `https://oauth.deriv.com/oauth2/authorize`
- WebSocket endpoint used by this project: `wss://ws.derivws.com/websockets/v3`

If you'd like, I can:
- Update `lib/websocket-manager.ts` to read `APP_ID` from `process.env.NEXT_PUBLIC_DERIV_APP_ID`.
- Implement the `/callback` handler to parse and persist tokens.
- Add a small example showing how to exchange an OAuth code (if the app uses authorization codes) — I will need confirmation of whether the app expects an access token directly in the redirect or an authorization code to exchange.
