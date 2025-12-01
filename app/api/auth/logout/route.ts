import { NextResponse } from 'next/server'
import { deleteSession } from '@/lib/server/session'

export async function POST(req: Request) {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'mesoflix_session'
    const cookies = req.headers.get('cookie') || ''
    const match = cookies.match(new RegExp(`${cookieName}=([^;]+)`))
    const sessionId = match ? match[1] : null
    if (sessionId) deleteSession(sessionId)

    const res = NextResponse.json({ success: true })
    // Clear cookie
    res.headers.set('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`)
    return res
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
