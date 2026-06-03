// ============================================================
// api.ts — HTTP API consumed by the Mini App. Every endpoint that touches a
// track authenticates the caller and authorizes per-user (no IDOR). Streaming
// uses short-lived signed capability URLs so a plain <audio> element works.
// ============================================================
import Fastify, { FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import fs from 'node:fs'
import { config } from './config.ts'
import { validateInitData } from './auth/initData.ts'
import { signStreamToken, verifyStreamToken } from './auth/streamToken.ts'
import { listTracks, getTrack, deleteTrack } from './db.ts'
import { audioPath, deleteAudio } from './storage.ts'
import { parseRange, mimeForExt } from './util/safe.ts'

/** Extract + validate Telegram initData from the Authorization header. */
function authUser(req: FastifyRequest): number | null {
  const h = req.headers['authorization']
  if (typeof h !== 'string' || !h.startsWith('tma ')) return null
  const initData = h.slice(4)
  const r = validateInitData(initData, config.botToken, config.initDataMaxAgeSec)
  return r.ok && r.user ? r.user.id : null
}

export function createApi() {
  // disableRequestLogging: stream URLs carry a signed token in the query string;
  // logging full request URLs would persist replayable capabilities to disk.
  const app = Fastify({ logger: true, disableRequestLogging: true, bodyLimit: 64 * 1024 })

  app.register(cors, {
    origin: config.allowedOrigins,
    methods: ['GET', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  })

  app.get('/api/health', async () => ({ ok: true }))

  // List my tracks → each with a short-lived signed stream URL.
  app.get('/api/tracks', async (req, reply) => {
    const uid = authUser(req)
    if (!uid) return reply.code(401).send({ error: 'unauthorized' })
    const tracks = listTracks(uid).map((t) => {
      const tok = signStreamToken(t.id, uid, config.streamSecret, config.streamTtlSec)
      return {
        id: t.id,
        title: t.title,
        artist: t.artist,
        duration: t.duration,
        size: t.size,
        url: `${config.publicBaseUrl}/api/stream/${t.id}?u=${uid}&t=${encodeURIComponent(tok)}`,
      }
    })
    return { tracks }
  })

  // Delete a track (owner only).
  app.delete('/api/tracks/:id', async (req, reply) => {
    const uid = authUser(req)
    if (!uid) return reply.code(401).send({ error: 'unauthorized' })
    const id = (req.params as { id: string }).id
    const row = getTrack(id)
    if (!row || row.user_id !== uid) return reply.code(404).send({ error: 'not_found' })
    deleteTrack(id, uid)
    await deleteAudio(id, row.ext)
    return { ok: true }
  })

  // Stream audio. Auth is the signed capability token in the URL (a media
  // element can't send headers); we still re-check ownership defensively.
  app.get('/api/stream/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id
    const q = req.query as { u?: string; t?: string }
    const uid = Number(q.u)
    if (!Number.isInteger(uid) || !q.t || !verifyStreamToken(q.t, id, uid, config.streamSecret)) {
      return reply.code(403).send({ error: 'forbidden' })
    }
    const row = getTrack(id)
    if (!row || row.user_id !== uid) return reply.code(404).send({ error: 'not_found' })
    const p = audioPath(id, row.ext)
    if (!p) return reply.code(404).send({ error: 'not_found' })

    let size: number
    try {
      size = (await fs.promises.stat(p)).size
    } catch {
      return reply.code(404).send({ error: 'gone' })
    }

    reply.header('Accept-Ranges', 'bytes')
    reply.header('Content-Type', mimeForExt(row.ext))
    reply.header('Cache-Control', 'private, max-age=3600')
    reply.header('X-Content-Type-Options', 'nosniff')

    const rawRange = req.headers['range']
    if (rawRange) {
      const range = parseRange(rawRange, size)
      if (!range) {
        reply.code(416).header('Content-Range', `bytes */${size}`)
        return reply.send()
      }
      reply.code(206)
      reply.header('Content-Range', `bytes ${range.start}-${range.end}/${size}`)
      reply.header('Content-Length', String(range.end - range.start + 1))
      return reply.send(fs.createReadStream(p, { start: range.start, end: range.end }))
    }

    reply.header('Content-Length', String(size))
    return reply.send(fs.createReadStream(p))
  })

  return app
}
