import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePersistedState } from './usePersistedState'
import { STORAGE_KEYS } from '../storage/storage'
import { apiEnabled, fetchTracks, deleteTrack as apiDeleteTrack, type ApiTrack } from '../api'

// ============================================================
// usePlaylist — плеер пользовательского плейлиста.
//
// Если настроен бэкенд (VITE_API_BASE) и мы внутри Telegram — треки грузятся
// с VPS и играют через настоящий HTMLAudioElement. Иначе (обычный веб-демо)
// используется мок-список с симуляцией прогресса. Интерфейс PlaylistApi один
// и тот же, поэтому PlaylistScreen менять не нужно.
// ============================================================

export interface Track {
  id: string
  title: string
  artist: string
  /** Длительность, секунд. */
  duration: number
  /** URL аудио с VPS. Если пусто → демо-режим с симуляцией. */
  src?: string
}

export type Repeat = 'off' | 'all' | 'one'

interface PlayerPrefs {
  volume: number
  shuffle: boolean
  repeat: Repeat
}
const DEFAULT_PREFS: PlayerPrefs = { volume: 0.8, shuffle: false, repeat: 'off' }

// Демо-плейлист в духе dark academia (используется вне Telegram / без бэкенда).
const MOCK_TRACKS: Track[] = [
  { id: 't1', title: 'Candlelit Study', artist: 'Aurelius', duration: 184 },
  { id: 't2', title: 'Rain on the Cloister', artist: 'M. Ficino', duration: 222 },
  { id: 't3', title: 'Brass & Vellum', artist: 'Hypatia', duration: 168 },
  { id: 't4', title: 'Midnight Marginalia', artist: 'The Scriveners', duration: 205 },
  { id: 't5', title: 'Ember Light Sonata', artist: 'Cassiodorus', duration: 241 },
]

function toTrack(t: ApiTrack): Track {
  return { id: t.id, title: t.title, artist: t.artist || '—', duration: t.duration, src: t.url }
}

export interface PlaylistApi {
  tracks: Track[]
  index: number
  current: Track | null
  playing: boolean
  /** Секунд проиграно текущего трека. */
  progress: number
  shuffle: boolean
  repeat: Repeat
  volume: number
  /** Идёт загрузка списка с бэкенда. */
  loading: boolean
  /** Текст ошибки загрузки/воспроизведения, либо null. */
  error: string | null
  /** Режим данных: реальный бэкенд или демо-мок. */
  source: 'api' | 'mock'
  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (sec: number) => void
  setVolume: (v: number) => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  select: (index: number) => void
  /** Перезагрузить список с бэкенда. */
  reload: () => void
  /** Удалить трек (бэкенд + локально). В демо-режиме — no-op. */
  remove: (id: string) => void
}

export function usePlaylist(): PlaylistApi {
  const useApi = apiEnabled()
  const [tracks, setTracks] = useState<Track[]>(useApi ? [] : MOCK_TRACKS)
  const [loading, setLoading] = useState<boolean>(useApi)
  const [error, setError] = useState<string | null>(null)

  const [prefs, setPrefs] = usePersistedState<PlayerPrefs>(STORAGE_KEYS.player, DEFAULT_PREFS)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const current = tracks[index] ?? null
  const isRealAudio = Boolean(current?.src)

  // ---- load tracks from the backend ----
  const reload = useCallback(() => {
    if (!apiEnabled()) return
    setLoading(true)
    setError(null)
    const ctrl = new AbortController()
    fetchTracks(ctrl.signal)
      .then((list) => {
        setTracks(list.map(toTrack))
        setIndex((i) => (i < list.length ? i : 0))
      })
      .catch((e) => {
        if (e?.name !== 'AbortError') setError('Не удалось загрузить плейлист')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    if (!useApi) return
    const cleanup = reload()
    return cleanup
  }, [useApi, reload])

  // ---- real <audio> element (only used when the current track has a src) ----
  const audioRef = useRef<HTMLAudioElement | null>(null)
  if (audioRef.current === null && typeof Audio !== 'undefined') {
    audioRef.current = new Audio()
  }

  // End-of-track handler kept in a ref so listeners always see fresh prefs.
  const handleEnd = useRef<() => void>(() => {})

  // Attach audio listeners once.
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setProgress(a.currentTime)
    const onEnded = () => handleEnd.current()
    const onError = () => {
      if (a.src) setError('Не удалось воспроизвести трек')
    }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnded)
    a.addEventListener('error', onError)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('ended', onEnded)
      a.removeEventListener('error', onError)
      a.pause()
    }
  }, [])

  // Keep the element's volume in sync.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = prefs.volume
  }, [prefs.volume])

  // Swap source when the current track changes.
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    if (current?.src) {
      if (a.src !== current.src) {
        a.src = current.src
        a.load()
      }
    } else {
      a.removeAttribute('src')
    }
    setError(null)
  }, [current?.src])

  // Drive play/pause for real audio from the `playing` flag.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !current?.src) return
    if (playing) {
      a.play().catch(() => setPlaying(false))
    } else {
      a.pause()
    }
  }, [playing, current?.src])

  // ---- transport ----
  const play = useCallback(() => {
    if (tracks.length) setPlaying(true)
  }, [tracks.length])
  const pause = useCallback(() => setPlaying(false), [])
  const toggle = useCallback(() => setPlaying((p) => (tracks.length ? !p : false)), [tracks.length])

  const select = useCallback((i: number) => {
    setIndex(i)
    setProgress(0)
    setPlaying(true)
  }, [])

  const advance = useCallback(
    (dir: 1 | -1, auto: boolean) => {
      setProgress(0)
      setIndex((cur) => {
        if (tracks.length === 0) return cur
        if (prefs.shuffle && dir === 1) {
          if (tracks.length === 1) return cur
          let n = cur
          while (n === cur) n = Math.floor(Math.random() * tracks.length)
          return n
        }
        let n = cur + dir
        if (n >= tracks.length) {
          // Конец списка: auto-переход останавливается, если repeat != 'all'.
          if (auto && prefs.repeat !== 'all') {
            setPlaying(false)
            return tracks.length - 1
          }
          n = 0
        }
        if (n < 0) n = tracks.length - 1
        return n
      })
    },
    [tracks.length, prefs.shuffle, prefs.repeat],
  )

  const next = useCallback(() => advance(1, false), [advance])
  const prev = useCallback(() => advance(-1, false), [advance])

  const seek = useCallback(
    (sec: number) => {
      if (!current) return
      const clamped = Math.max(0, Math.min(current.duration, sec))
      setProgress(clamped)
      const a = audioRef.current
      if (a && current.src) a.currentTime = clamped
    },
    [current],
  )

  const setVolume = useCallback((v: number) => setPrefs((p) => ({ ...p, volume: Math.max(0, Math.min(1, v)) })), [setPrefs])
  const toggleShuffle = useCallback(() => setPrefs((p) => ({ ...p, shuffle: !p.shuffle })), [setPrefs])
  const cycleRepeat = useCallback(
    () => setPrefs((p) => ({ ...p, repeat: p.repeat === 'off' ? 'all' : p.repeat === 'all' ? 'one' : 'off' })),
    [setPrefs],
  )

  const remove = useCallback(
    (id: string) => {
      if (!apiEnabled()) return
      setTracks((list) => {
        const pos = list.findIndex((t) => t.id === id)
        if (pos < 0) return list
        const next = list.filter((t) => t.id !== id)
        // Keep the index valid relative to the removed item.
        setIndex((cur) => (pos < cur ? cur - 1 : Math.min(cur, Math.max(0, next.length - 1))))
        if (next.length === 0) setPlaying(false)
        return next
      })
      apiDeleteTrack(id).catch(() => {
        setError('Не удалось удалить трек')
        reload()
      })
    },
    [reload],
  )

  // Конец трека: repeat 'one' — заново, иначе следующий (auto).
  handleEnd.current = () => {
    if (prefs.repeat === 'one') {
      setProgress(0)
      const a = audioRef.current
      if (a && isRealAudio) {
        a.currentTime = 0
        a.play().catch(() => {})
      }
      return
    }
    advance(1, true)
  }

  // Симуляция воспроизведения для демо-режима (мок без src).
  useEffect(() => {
    if (!playing || !current || isRealAudio) return
    const id = window.setInterval(() => {
      setProgress((p) => {
        const np = p + 0.5
        if (np < current.duration) return np
        queueMicrotask(() => handleEnd.current())
        return current.duration
      })
    }, 500)
    return () => window.clearInterval(id)
  }, [playing, current, isRealAudio])

  return useMemo(
    () => ({
      tracks,
      index,
      current,
      playing,
      progress,
      shuffle: prefs.shuffle,
      repeat: prefs.repeat,
      volume: prefs.volume,
      loading,
      error,
      source: useApi ? 'api' : 'mock',
      play,
      pause,
      toggle,
      next,
      prev,
      seek,
      setVolume,
      toggleShuffle,
      cycleRepeat,
      select,
      reload,
      remove,
    }),
    [tracks, index, current, playing, progress, prefs, loading, error, useApi, play, pause, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, select, reload, remove],
  )
}
