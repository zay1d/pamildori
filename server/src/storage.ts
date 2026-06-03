// ============================================================
// storage.ts — audio files on disk. Paths are built only from a server-issued
// UUID + an allow-listed extension (see util/safe), and re-checked to stay
// inside the audio directory (defense in depth against path traversal).
// ============================================================
import path from 'node:path'
import fs from 'node:fs'
import { config } from './config.ts'
import { safeStoredName } from './util/safe.ts'

const audioDir = path.join(config.dataDir, 'audio')
fs.mkdirSync(audioDir, { recursive: true })

/** Absolute path for a track file, or null if id/ext are untrusted or escape the dir. */
export function audioPath(id: string, ext: string): string | null {
  const name = safeStoredName(id, ext)
  if (!name) return null
  const p = path.join(audioDir, name)
  const rel = path.relative(audioDir, p)
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null
  return p
}

/** Write a new file; fails (wx) if it already exists. Returns the path or null. */
export async function saveAudio(id: string, ext: string, data: Buffer): Promise<string | null> {
  const p = audioPath(id, ext)
  if (!p) return null
  await fs.promises.writeFile(p, data, { flag: 'wx', mode: 0o640 })
  return p
}

export async function deleteAudio(id: string, ext: string): Promise<void> {
  const p = audioPath(id, ext)
  if (!p) return
  try {
    await fs.promises.unlink(p)
  } catch {
    /* already gone */
  }
}
