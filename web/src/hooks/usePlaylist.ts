import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePersistedState } from './usePersistedState'
import { STORAGE_KEYS } from '../storage/storage'

// ============================================================
// usePlaylist — плеер пользовательского плейлиста.
//
// Сейчас работает на МОК-треках с симуляцией воспроизведения (прогресс
// тикает таймером), чтобы UI был живым на демо. Когда появится VPS-бэкенд,
// мок-список заменится загруженным с API, а симуляция — реальным
// HTMLAudioElement (интерфейс хука менять не придётся).
// ============================================================

export interface Track {
  id: string
  title: string
  artist: string
  /** Длительность, секунд. */
  duration: number
  /** URL аудио (появится с VPS); пока пусто → симуляция. */
  src?: string
}

export type Repeat = 'off' | 'all' | 'one'

interface PlayerPrefs {
  volume: number
  shuffle: boolean
  repeat: Repeat
}
const DEFAULT_PREFS: PlayerPrefs = { volume: 0.8, shuffle: false, repeat: 'off' }

// Демо-плейлист в духе dark academia (заменится треками с VPS).
const MOCK_TRACKS: Track[] = [
  { id: 't1', title: 'Candlelit Study', artist: 'Aurelius', duration: 184 },
  { id: 't2', title: 'Rain on the Cloister', artist: 'M. Ficino', duration: 222 },
  { id: 't3', title: 'Brass & Vellum', artist: 'Hypatia', duration: 168 },
  { id: 't4', title: 'Midnight Marginalia', artist: 'The Scriveners', duration: 205 },
  { id: 't5', title: 'Ember Light Sonata', artist: 'Cassiodorus', duration: 241 },
]

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
}

export function usePlaylist(): PlaylistApi {
  const tracks = MOCK_TRACKS
  const [prefs, setPrefs] = usePersistedState<PlayerPrefs>(STORAGE_KEYS.player, DEFAULT_PREFS)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  const current = tracks[index] ?? null

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
      setProgress(Math.max(0, Math.min(current.duration, sec)))
    },
    [current],
  )

  const setVolume = useCallback((v: number) => setPrefs((p) => ({ ...p, volume: Math.max(0, Math.min(1, v)) })), [setPrefs])
  const toggleShuffle = useCallback(() => setPrefs((p) => ({ ...p, shuffle: !p.shuffle })), [setPrefs])
  const cycleRepeat = useCallback(
    () => setPrefs((p) => ({ ...p, repeat: p.repeat === 'off' ? 'all' : p.repeat === 'all' ? 'one' : 'off' })),
    [setPrefs],
  )

  // Конец трека: repeat 'one' — заново, иначе следующий (auto).
  const handleEnd = useRef<() => void>(() => {})
  handleEnd.current = () => {
    if (prefs.repeat === 'one') {
      setProgress(0)
      return
    }
    advance(1, true)
  }

  // Симуляция воспроизведения: тик прогресса, пока playing.
  useEffect(() => {
    if (!playing || !current) return
    const id = window.setInterval(() => {
      setProgress((p) => {
        const np = p + 0.5
        if (np < current.duration) return np
        queueMicrotask(() => handleEnd.current())
        return current.duration
      })
    }, 500)
    return () => window.clearInterval(id)
  }, [playing, current])

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
    }),
    [tracks, index, current, playing, progress, prefs, play, pause, toggle, next, prev, seek, setVolume, toggleShuffle, cycleRepeat, select],
  )
}
