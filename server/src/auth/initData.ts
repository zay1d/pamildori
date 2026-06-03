// ============================================================
// auth/initData.ts — validate Telegram Mini App initData.
// Pure (only node:crypto) so it is unit-testable without a network or DB.
// Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// ============================================================
import crypto from 'node:crypto'

export interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

export interface InitDataResult {
  ok: boolean
  reason?: string
  user?: TelegramUser
  authDate?: number
}

/**
 * Validate the HMAC signature of Telegram WebApp initData and the freshness of
 * auth_date. Returns the parsed user on success.
 *
 * @param initData  raw query-string as provided by Telegram.WebApp.initData
 * @param botToken  bot token (secret) — used to derive the signing key
 * @param maxAgeSec reject data older than this (0 disables the age check)
 */
export function validateInitData(initData: string, botToken: string, maxAgeSec = 86400): InitDataResult {
  if (!initData || typeof initData !== 'string') return { ok: false, reason: 'empty' }
  if (!botToken) return { ok: false, reason: 'no_token' }

  let params: URLSearchParams
  try {
    params = new URLSearchParams(initData)
  } catch {
    return { ok: false, reason: 'parse' }
  }

  const hash = params.get('hash')
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return { ok: false, reason: 'no_hash' }

  // data_check_string: every field except `hash`, "key=value" lines sorted by key.
  const pairs: string[] = []
  for (const [k, v] of params.entries()) {
    if (k === 'hash') continue
    pairs.push(`${k}=${v}`)
  }
  pairs.sort()
  const dataCheckString = pairs.join('\n')

  // secret_key = HMAC_SHA256(key="WebAppData", data=botToken)
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computed = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')

  const a = Buffer.from(computed, 'hex')
  const b = Buffer.from(hash, 'hex')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'bad_hash' }

  // freshness — guards against replay of stale (or future-dated) initData
  const authDate = Number(params.get('auth_date') || 0)
  if (!Number.isInteger(authDate) || authDate <= 0) return { ok: false, reason: 'no_auth_date' }
  const ageSec = Math.floor(Date.now() / 1000) - authDate
  if (maxAgeSec > 0 && ageSec > maxAgeSec) return { ok: false, reason: 'expired' }
  if (ageSec < -300) return { ok: false, reason: 'future' } // allow small clock skew only

  const userRaw = params.get('user')
  if (!userRaw) return { ok: false, reason: 'no_user' }
  let user: TelegramUser
  try {
    user = JSON.parse(userRaw) as TelegramUser
  } catch {
    return { ok: false, reason: 'bad_user' }
  }
  if (!user || typeof user.id !== 'number' || !Number.isInteger(user.id) || user.id <= 0) {
    return { ok: false, reason: 'bad_user_id' }
  }

  return { ok: true, user, authDate }
}
