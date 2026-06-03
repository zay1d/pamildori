import { useEffect, useState } from 'react'
import { Settings } from '../types'
import { tg } from '../telegram'
import type { TimeOfDay } from '../render/pixelArt'

// ============================================================
// useTheme — выводит эффективную тему (night/day) и время суток
// для сцены из настроек + системы/Telegram.
// ============================================================

export type EffectiveTheme = 'night' | 'day'

/** Время суток по реальным часам (для авто-режима). */
function timeOfDayNow(): TimeOfDay {
  const h = new Date().getHours()
  if (h >= 22 || h < 5) return 'night'
  if (h < 7) return 'dawn'
  if (h < 9) return 'twilight'
  if (h < 18) return 'day'
  if (h < 20) return 'dusk'
  return 'twilight'
}

function systemPrefersDark(): boolean {
  if (tg) return tg.colorScheme === 'dark'
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true
}

export interface ResolvedTheme {
  theme: EffectiveTheme
  timeofday: TimeOfDay
}

export function useTheme(settings: Settings): ResolvedTheme {
  // Обновляем время суток раз в минуту (для авто-режима).
  const [, setTick] = useState(0)
  useEffect(() => {
    if (settings.timeMode !== 'auto' && settings.theme !== 'system') return
    const id = window.setInterval(() => setTick((n) => (n + 1) % 1440), 60_000)
    return () => window.clearInterval(id)
  }, [settings.timeMode, settings.theme])

  // Базовая тема из настроек.
  let theme: EffectiveTheme
  if (settings.theme === 'dark') theme = 'night'
  else if (settings.theme === 'light') theme = 'day'
  else theme = systemPrefersDark() ? 'night' : 'day'

  // Время суток для сцены.
  let timeofday: TimeOfDay
  if (settings.timeMode === 'day') {
    timeofday = 'day'
    theme = 'day'
  } else if (settings.timeMode === 'night') {
    timeofday = 'night'
    theme = 'night'
  } else {
    // auto: по часам, тема следует за светлостью времени суток
    timeofday = timeOfDayNow()
    theme = timeofday === 'day' || timeofday === 'dawn' ? 'day' : 'night'
  }

  return { theme, timeofday }
}
