// ============================================================
// db.ts — SQLite (better-sqlite3) schema + prepared statements.
// All queries are parameterized (no string interpolation) → no SQL injection.
// ============================================================
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import { config } from './config.ts'

fs.mkdirSync(config.dataDir, { recursive: true })
const dbPath = path.join(config.dataDir, 'pamildori.db')

export const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY,
    first_name  TEXT,
    username    TEXT,
    created_at  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tracks (
    id          TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    title       TEXT NOT NULL,
    artist      TEXT NOT NULL DEFAULT '',
    duration    INTEGER NOT NULL DEFAULT 0,
    ext         TEXT NOT NULL,
    mime        TEXT NOT NULL,
    size        INTEGER NOT NULL,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_tracks_user ON tracks(user_id, created_at DESC);
`)

export interface TrackRow {
  id: string
  user_id: number
  title: string
  artist: string
  duration: number
  ext: string
  mime: string
  size: number
  created_at: number
}

const stmts = {
  upsertUser: db.prepare(
    `INSERT INTO users (id, first_name, username, created_at) VALUES (?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET first_name=excluded.first_name, username=excluded.username`,
  ),
  insertTrack: db.prepare(
    `INSERT INTO tracks (id,user_id,title,artist,duration,ext,mime,size,created_at)
     VALUES (@id,@user_id,@title,@artist,@duration,@ext,@mime,@size,@created_at)`,
  ),
  listByUser: db.prepare(`SELECT * FROM tracks WHERE user_id = ? ORDER BY created_at DESC`),
  getById: db.prepare(`SELECT * FROM tracks WHERE id = ?`),
  deleteOwned: db.prepare(`DELETE FROM tracks WHERE id = ? AND user_id = ?`),
  countByUser: db.prepare(`SELECT COUNT(*) AS n FROM tracks WHERE user_id = ?`),
}

export function upsertUser(id: number, firstName?: string, username?: string): void {
  stmts.upsertUser.run(id, firstName ?? null, username ?? null, Math.floor(Date.now() / 1000))
}
export function insertTrack(t: TrackRow): void {
  stmts.insertTrack.run(t)
}
export function listTracks(userId: number): TrackRow[] {
  return stmts.listByUser.all(userId) as TrackRow[]
}
export function getTrack(id: string): TrackRow | undefined {
  return stmts.getById.get(id) as TrackRow | undefined
}
export function deleteTrack(id: string, userId: number): boolean {
  return stmts.deleteOwned.run(id, userId).changes > 0
}
export function trackCount(userId: number): number {
  return (stmts.countByUser.get(userId) as { n: number }).n
}
