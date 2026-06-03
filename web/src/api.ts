// ============================================================
// api.ts — client for the Pamildori backend (api.pamildori.uz).
// Auth = Telegram initData passed as `Authorization: tma <initData>`, validated
// server-side via HMAC. Base URL comes from VITE_API_BASE at build time; when
// it's unset or we're not inside Telegram, the app falls back to mock data.
// ============================================================
import { tg } from './telegram'

const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')

/** True when a real backend is configured AND we have Telegram initData to auth with. */
export function apiEnabled(): boolean {
  return Boolean(BASE && tg && tg.initData)
}

export interface ApiTrack {
  id: string
  title: string
  artist: string
  duration: number
  size: number
  /** Short-lived signed stream URL, usable directly as <audio> src. */
  url: string
}

function authHeaders(): HeadersInit {
  return { Authorization: `tma ${tg?.initData ?? ''}` }
}

export async function fetchTracks(signal?: AbortSignal): Promise<ApiTrack[]> {
  const res = await fetch(`${BASE}/api/tracks`, { headers: authHeaders(), signal })
  if (!res.ok) throw new Error(`tracks ${res.status}`)
  const data = (await res.json()) as { tracks: ApiTrack[] }
  return Array.isArray(data.tracks) ? data.tracks : []
}

export async function deleteTrack(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/tracks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`delete ${res.status}`)
}
