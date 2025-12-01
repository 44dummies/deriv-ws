import { NextResponse } from 'next/server'
import { createSession } from '@/lib/server/session'

// POST /api/auth/exchange
// Body: { code: string }
// Exchanges an OAuth `code` for tokens using Deriv's token endpoint,
// persists them server-side and sets an HttpOnly session cookie.

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const code = body?.code
    if (!code) {
      return NextResponse.json({ error: 'missing code' }, { status: 400 })
    }

    const tokenUrl = process.env.DERIV_TOKEN_URL ?? 'https://oauth.deriv.com/oauth2/token'
    const client_id = process.env.DERIV_CLIENT_ID ?? process.env.NEXT_PUBLIC_DERIV_APP_ID
    const client_secret = process.env.DERIV_CLIENT_SECRET
    const redirect_uri = process.env.DERIV_REDIRECT_URI

    if (!client_id) {
      return NextResponse.json({ error: 'server not configured with DERIV_CLIENT_ID' }, { status: 500 })
    }

    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('code', code)
    if (redirect_uri) params.append('redirect_uri', redirect_uri)
    params.append('client_id', client_id)
    if (client_secret) params.append('client_secret', client_secret)

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const data = await resp.json()

    if (!resp.ok) {
      return NextResponse.json({ error: 'token exchange failed', detail: data }, { status: resp.status })
    }

    // Persist tokens server-side and return a session cookie
    const sessionId = createSession({ token_response: data })

    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'mesoflix_session'
    const secure = process.env.NODE_ENV === 'production'
    const maxAge = (data && data.expires_in) ? Number(data.expires_in) : 7 * 24 * 3600

    const cookie = `${cookieName}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; ${secure ? 'Secure;' : ''}`

    const res = NextResponse.json({ success: true })
    res.headers.set('Set-Cookie', cookie)
    return res
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
