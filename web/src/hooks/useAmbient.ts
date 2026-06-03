import { useCallback, useEffect, useMemo, useRef } from 'react'
import { usePersistedState } from './usePersistedState'
import { STORAGE_KEYS } from '../storage/storage'
import { AMBIENTS, ambientUrl } from '../ambient'

// ============================================================
// useAmbient — плеер фоновых звуков (дождь, камин…).
//
// Каждый звук — отдельный зацикленный <audio>, поэтому несколько можно включать
// одновременно (камин + дождь) и параллельно с пользовательским плейлистом —
// это независимые звуковые слои. Вкл/выкл и громкость на каждый звук сохраняются.
//
// Хук поднят в App (а не внутри PlaylistScreen), чтобы звуки продолжали играть
// при переходе на другие вкладки — например, фон под таймером во время фокуса.
// ============================================================

export interface AmbientState {
  on: boolean
  vol: number
}
export type AmbientStates = Record<string, AmbientState>

const DEFAULT: AmbientStates = Object.fromEntries(
  AMBIENTS.map((a) => [a.id, { on: false, vol: 0.5 }]),
)

export interface AmbientApi {
  states: AmbientStates
  toggle: (id: string) => void
  setVol: (id: string, v: number) => void
  /** Хотя бы один звук включён. */
  anyOn: boolean
}

export function useAmbient(): AmbientApi {
  const [stored, setStored] = usePersistedState<AmbientStates>(STORAGE_KEYS.ambient, DEFAULT)
  // Один аудио-элемент на звук, создаётся лениво при первом включении.
  const elements = useRef<Record<string, HTMLAudioElement>>({})

  // Дополняем сохранённое значениями по умолчанию — на случай, если реестр
  // звуков пополнился с момента последнего сохранения.
  const states = useMemo<AmbientStates>(() => ({ ...DEFAULT, ...stored }), [stored])

  // Синхронизируем каждый <audio> с его состоянием (вкл/выкл + громкость).
  useEffect(() => {
    if (typeof Audio === 'undefined') return
    for (const def of AMBIENTS) {
      const st = states[def.id] ?? { on: false, vol: 0.5 }
      let el = elements.current[def.id]
      if (st.on) {
        if (!el) {
          el = new Audio(ambientUrl(def.file))
          el.loop = true
          elements.current[def.id] = el
        }
        el.volume = st.vol
        // play() инициируется после клика (юзер-жест) → автоплей разрешён.
        if (el.paused) void el.play().catch(() => {})
      } else if (el) {
        el.pause()
      }
    }
  }, [states])

  // Останавливаем все звуки при размонтировании.
  useEffect(() => {
    const els = elements.current
    return () => {
      for (const el of Object.values(els)) el.pause()
    }
  }, [])

  const toggle = useCallback(
    (id: string) =>
      setStored((s) => {
        const cur = s[id] ?? { on: false, vol: 0.5 }
        return { ...s, [id]: { ...cur, on: !cur.on } }
      }),
    [setStored],
  )

  const setVol = useCallback(
    (id: string, v: number) => {
      const vol = Math.max(0, Math.min(1, v))
      setStored((s) => {
        const cur = s[id] ?? { on: false, vol: 0.5 }
        return { ...s, [id]: { ...cur, vol } }
      })
    },
    [setStored],
  )

  const anyOn = useMemo(() => AMBIENTS.some((a) => states[a.id]?.on), [states])

  return useMemo(() => ({ states, toggle, setVol, anyOn }), [states, toggle, setVol, anyOn])
}
