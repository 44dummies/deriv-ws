import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const SESSIONS_DIR = path.resolve(process.cwd(), 'data', 'sessions')

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

function getSecret(): Buffer {
  const s = process.env.SESSION_SECRET || 'default_dev_secret_change_me'
  return crypto.createHash('sha256').update(s).digest()
}

function encrypt(json: string): string {
  const iv = crypto.randomBytes(12)
  const key = getSecret()
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

function decrypt(data: string): string | null {
  try {
    const buf = Buffer.from(data, 'base64')
    const iv = buf.slice(0, 12)
    const tag = buf.slice(12, 28)
    const encrypted = buf.slice(28)
    const key = getSecret()
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  } catch (e) {
    return null
  }
}

function cleanupExpired() {
  try {
    ensureDir()
    const files = fs.readdirSync(SESSIONS_DIR)
    const now = Date.now()
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf8')
        const obj = JSON.parse(raw)
        if (obj.expiresAt && now > obj.expiresAt) {
          fs.unlinkSync(path.join(SESSIONS_DIR, f))
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
  }
}

export function createSession(payload: any, maxAgeSeconds = 7 * 24 * 3600): string {
  ensureDir()
  cleanupExpired()
  const id = (globalThis as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const expiresAt = Date.now() + maxAgeSeconds * 1000
  const filePath = path.join(SESSIONS_DIR, `${id}.json`)
  const stored = { created: Date.now(), expiresAt, payload }
  const enc = encrypt(JSON.stringify(stored))
  fs.writeFileSync(filePath, enc, { encoding: 'utf8' })
  return id
}

export function getSession(id: string): any | null {
  try {
    const filePath = path.join(SESSIONS_DIR, `${id}.json`)
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf8')
    const dec = decrypt(raw)
    if (!dec) return null
    const obj = JSON.parse(dec)
    if (obj.expiresAt && Date.now() > obj.expiresAt) {
      try {
        fs.unlinkSync(filePath)
      } catch (e) {
        // ignore
      }
      return null
    }
    return obj.payload
  } catch (e) {
    return null
  }
}

export function deleteSession(id: string): boolean {
  try {
    const filePath = path.join(SESSIONS_DIR, `${id}.json`)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return true
  } catch (e) {
    return false
  }
}
