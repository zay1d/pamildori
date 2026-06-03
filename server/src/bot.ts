// ============================================================
// bot.ts — Telegram bot (grammY, long polling). A user sends an audio file;
// the bot downloads it (≤ ~20 MB, the getFile limit), stores it on disk under
// a server-issued UUID, and records it in that user's playlist.
// ============================================================
import { Bot } from 'grammy'
import crypto from 'node:crypto'
import { config } from './config.ts'
import { extFor } from './util/safe.ts'
import { upsertUser, insertTrack, trackCount } from './db.ts'
import { saveAudio } from './storage.ts'

const MAX_TRACKS_PER_USER = 500

export function createBot(): Bot {
  const bot = new Bot(config.botToken)

  bot.command('start', (ctx) =>
    ctx.reply(
      '🎧 Send me an audio file and I will add it to your Pamildori playlist.\n' +
        'Open the app from the menu button to listen while you focus.',
    ),
  )

  bot.on(['message:audio', 'message:voice', 'message:document'], async (ctx) => {
    const from = ctx.from
    if (!from) return
    const msg = ctx.message

    let fileId: string
    let size: number | undefined
    let mime: string | undefined
    let fname: string | undefined
    let title: string | undefined
    let artist: string | undefined
    let duration = 0

    if (msg.audio) {
      fileId = msg.audio.file_id
      size = msg.audio.file_size
      mime = msg.audio.mime_type
      fname = msg.audio.file_name
      title = msg.audio.title
      artist = msg.audio.performer
      duration = msg.audio.duration ?? 0
    } else if (msg.voice) {
      fileId = msg.voice.file_id
      size = msg.voice.file_size
      mime = msg.voice.mime_type
      duration = msg.voice.duration ?? 0
    } else if (msg.document && (msg.document.mime_type ?? '').startsWith('audio/')) {
      fileId = msg.document.file_id
      size = msg.document.file_size
      mime = msg.document.mime_type
      fname = msg.document.file_name
    } else {
      await ctx.reply('Please send an audio file 🎵')
      return
    }

    const ext = extFor(mime, fname)
    if (!ext) {
      await ctx.reply('Unsupported audio format.')
      return
    }
    if (size && size > config.maxAudioBytes) {
      await ctx.reply(
        `That file is too large (max ${Math.floor(config.maxAudioBytes / 1024 / 1024)} MB — ` +
          'Telegram bots cannot fetch larger files).',
      )
      return
    }
    if (trackCount(from.id) >= MAX_TRACKS_PER_USER) {
      await ctx.reply('Your playlist is full — delete a track in the app first.')
      return
    }

    // Resolve + download the file (getFile only works for files ≤ 20 MB).
    let filePath: string | undefined
    try {
      const file = await ctx.api.getFile(fileId)
      filePath = file.file_path
    } catch {
      await ctx.reply('Could not fetch that file (it may be larger than 20 MB).')
      return
    }
    if (!filePath) {
      await ctx.reply('Could not fetch that file.')
      return
    }

    // SECURITY: this URL contains the bot token — never log it (or any error
    // value that embeds it). A leaked token = full bot takeover.
    const url = `https://api.telegram.org/file/bot${config.botToken}/${filePath}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30_000)
    let buf: Buffer
    try {
      const res = await fetch(url, { signal: controller.signal, redirect: 'error' })
      if (!res.ok) throw new Error('http ' + res.status)
      // Reject early on advertised size; don't trust Telegram's optional size field alone.
      const cl = Number(res.headers.get('content-length') || 0)
      if (cl > config.maxAudioBytes) throw new Error('too large')
      buf = Buffer.from(await res.arrayBuffer())
    } catch {
      await ctx.reply('Download failed or file too large, please try again.')
      return
    } finally {
      clearTimeout(timer)
    }
    if (buf.length === 0 || buf.length > config.maxAudioBytes) {
      await ctx.reply('File is empty or too large.')
      return
    }

    const id = crypto.randomUUID()
    let saved: string | null
    try {
      saved = await saveAudio(id, ext, buf)
    } catch {
      saved = null
    }
    if (!saved) {
      await ctx.reply('Internal error storing the file.')
      return
    }

    upsertUser(from.id, from.first_name, from.username)
    insertTrack({
      id,
      user_id: from.id,
      title: (title || fname || 'Untitled').slice(0, 200),
      artist: (artist || '').slice(0, 200),
      duration,
      ext,
      mime: mime || 'application/octet-stream',
      size: buf.length,
      created_at: Math.floor(Date.now() / 1000),
    })
    await ctx.reply(`✅ Added “${title || fname || 'track'}” to your playlist.`)
  })

  bot.catch((err) => {
    // Never crash the poller on a single bad update; log without secrets.
    console.error('bot error:', err.error instanceof Error ? err.error.message : 'unknown')
  })

  return bot
}
