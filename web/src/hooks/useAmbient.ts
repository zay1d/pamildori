import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePersistedState } from './usePersistedState'
import { STORAGE_KEYS } from '../storage/storage'
import { setVolume as setAudioVolume, resumeAudio } from '../audio/volume'
import { AMBIENTS, ambientUrl } from '../ambient'

// ============================================================
// useAmbient — плеер фоновых звуков (дождь, камин…).
//
// Каждый звук — отдельный зацикленный <audio>, поэтому несколько можно включать
// одновременно (камин + дождь) и параллельно с пользовательским плейлистом.
// Громкость — через Web Audio gain (работает на iOS, независимо от системной).
//
// ВАЖНО: между сессиями сохраняем ТОЛЬКО громкости. Состояние вкл/выкл НЕ
// сохраняем — при каждом открытии все звуки выключены, чтобы дождь (или любой
// другой) не включался сам при входе в приложение.
//
// Хук поднят в App, чтобы звуки продолжали играть при переходе между вкладками.
// ============================================================

export interface AmbientState {
  on: boolean
  vol: number
}
export type AmbientStates = Record<string, AmbientState>

const DEFAULT_VOLS: Record<string, number> = Object.fromEntries(AMBIENTS.map((a) => [a.id, 0.5]))

export interface AmbientApi {
  states: AmbientStates
  toggle: (id: string) => void
  setVol: (id: string, v: number) => void
  /** Хотя бы один звук включён. */
  anyOn: boolean
}

export function useAmbient(): AmbientApi {
  // Громкости — постоянные; вкл/выкл — эфемерные (на сессию, всегда стартуют off).
  const [vols, setVols] = usePersistedState<Record<string, number>>(STORAGE_KEYS.ambientVol, DEFAULT_VOLS)
  const [ons, setOns] = useState<Record<string, boolean>>({})
  // Один аудио-элемент на звук, создаётся лениво при первом включении.
  const elements = useRef<Record<string, HTMLAudioElement>>({})

  const states = useMemo<AmbientStates>(
    () =>
      Object.fromEntries(
        AMBIENTS.map((a) => [a.id, { on: ons[a.id] ?? false, vol: vols[a.id] ?? 0.5 }]),
      ),
    [ons, vols],
  )

  // Синхронизируем каждый <audio> с его состоянием (вкл/выкл + громкость).
  useEffect(() => {
    if (typeof Audio === 'undefined') return
    for (const def of AMBIENTS) {
      const st = states[def.id]
      let el = elements.current[def.id]
      if (st.on && !el) {
        el = new Audio(ambientUrl(def.file))
        el.loop = true
        elements.current[def.id] = el
      }
      if (!el) continue
      // Громкость через Web Audio gain — работает на iOS и независимо от
      // системной громкости; держим в синхроне всегда (слайдер меняет вживую).
      setAudioVolume(el, st.vol)
      if (st.on) {
        // play() инициируется после клика (юзер-жест) → автоплей разрешён.
        if (el.paused) void el.play().catch(() => {})
      } else {
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

  const toggle = useCallback((id: string) => {
    resumeAudio() // юзер-жест → разблокировать Web Audio на iOS
    setOns((s) => ({ ...s, [id]: !(s[id] ?? false) }))
  }, [])

  const setVol = useCallback(
    (id: string, v: number) => {
      const vol = Math.max(0, Math.min(1, v))
      setVols((s) => ({ ...s, [id]: vol }))
    },
    [setVols],
  )

  const anyOn = useMemo(() => AMBIENTS.some((a) => ons[a.id]), [ons])

  return useMemo(() => ({ states, toggle, setVol, anyOn }), [states, toggle, setVol, anyOn])
}
