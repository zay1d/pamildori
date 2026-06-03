// ============================================================
// util/safe.ts — pure helpers for safe file handling and HTTP Range parsing.
// Stored filenames are ALWAYS "<uuid>.<ext>" derived here from a server-issued
// id + an allow-listed extension; user-supplied names never touch the path,
// which structurally prevents path traversal.
// ============================================================

// allow-list of audio mime → canonical extension
const EXT_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/opus': 'opus',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
}
export const ALLOWED_EXT = new Set(Object.values(EXT_BY_MIME))

const MIME_BY_EXT: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
  flac: 'audio/flac',
  wav: 'audio/wav',
  webm: 'audio/webm',
}

/** Pick a canonical, allow-listed extension from mime, falling back to filename. */
export function extFor(mime?: string | null, fileName?: string | null): string | null {
  if (mime) {
    const m = mime.toLowerCase().split(';')[0].trim()
    if (EXT_BY_MIME[m]) return EXT_BY_MIME[m]
  }
  if (fileName) {
    const m = /\.([a-z0-9]{1,5})$/i.exec(fileName)
    if (m) {
      const e = m[1].toLowerCase()
      if (ALLOWED_EXT.has(e)) return e
    }
  }
  return null
}

export function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext] || 'application/octet-stream'
}

// UUID v4 shape only — the only id format we ever generate for tracks.
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isSafeId(id: string): boolean {
  return typeof id === 'string' && ID_RE.test(id)
}

/** Build the on-disk basename. Returns null if id/ext are not trustworthy. */
export function safeStoredName(id: string, ext: string): string | null {
  if (!isSafeId(id)) return null
  if (!ALLOWED_EXT.has(ext)) return null
  return `${id}.${ext}`
}

export interface ParsedRange {
  start: number
  end: number
}

/**
 * Parse a single-range "bytes=start-end" header against a known size.
 * Returns null for absent/invalid/unsatisfiable ranges (caller decides the
 * response: full body for null-absent, 416 for unsatisfiable).
 */
export function parseRange(header: string | undefined | null, size: number): ParsedRange | null {
  if (!header) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m) return null
  const s = m[1]
  const e = m[2]
  if (s === '' && e === '') return null

  let start: number
  let end: number
  if (s === '') {
    // suffix range: last N bytes
    const n = Number(e)
    if (!Number.isInteger(n) || n <= 0) return null
    start = Math.max(0, size - n)
    end = size - 1
  } else {
    start = Number(s)
    end = e === '' ? size - 1 : Number(e)
  }
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null
  if (start < 0 || end < start || end >= size) return null
  return { start, end }
}
