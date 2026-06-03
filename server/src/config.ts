// ============================================================
// config.ts — environment configuration. Secrets come only from env;
// nothing sensitive is hard-coded. Throws early if required vars are missing.
// ============================================================
import crypto from 'node:crypto'

function req(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var ${name}`)
  return v
}
function int(name: string, def: number): number {
  const v = process.env[name]
  if (v === undefined || v === '') return def
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`Env ${name} must be a number`)
  return n
}

const botToken = req('BOT_TOKEN')

export const config = {
  botToken,
  port: int('PORT', 8080),
  // Behind Caddy → bind localhost by default; set HOST=0.0.0.0 in containers.
  host: process.env.HOST || '127.0.0.1',
  dataDir: process.env.DATA_DIR || './data',
  publicBaseUrl: req('PUBLIC_BASE_URL').replace(/\/+$/, ''),
  // CORS allow-list — the Mini App origin(s). Comma-separated.
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'https://zay1d.github.io')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Telegram bots can only download files up to ~20 MB via getFile.
  maxAudioBytes: int('MAX_AUDIO_MB', 20) * 1024 * 1024,
  initDataMaxAgeSec: int('INITDATA_MAX_AGE_SEC', 86400),
  streamTtlSec: int('STREAM_TTL_SEC', 6 * 3600),
  // Separate signing secret for stream capability tokens; derived from the bot
  // token if not explicitly provided so it is never empty.
  streamSecret:
    process.env.STREAM_SECRET ||
    crypto.createHmac('sha256', botToken).update('pamildori-stream-v1').digest('hex'),
}
