// ============================================================
// auth/streamToken.ts — short-lived signed capability tokens for audio
// streaming. A <audio> element can't send Authorization headers, so the
// authenticated /api/tracks endpoint hands back stream URLs carrying an
// HMAC token bound to (trackId, userId, expiry). Pure (node:crypto only).
// ============================================================
import crypto from 'node:crypto'

function sign(trackId: string, userId: number, exp: number, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${trackId}.${userId}.${exp}`).digest('base64url')
}

/** Returns a token "<expEpochSec>.<sig>" valid for ttlSec seconds. */
export function signStreamToken(trackId: string, userId: number, secret: string, ttlSec = 6 * 3600, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + ttlSec
  return `${exp}.${sign(trackId, userId, exp, secret)}`
}

/** Constant-time verify of a stream token against (trackId, userId). */
export function verifyStreamToken(token: string, trackId: string, userId: number, secret: string, now = Date.now()): boolean {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const exp = Number(token.slice(0, dot))
  const sig = token.slice(dot + 1)
  if (!Number.isInteger(exp) || exp * 1000 < now) return false
  const expected = sign(trackId, userId, exp, secret)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
