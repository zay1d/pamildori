import { useCallback, useMemo } from 'react'
import { usePersistedState } from './usePersistedState'
import { STORAGE_KEYS } from '../storage/storage'
import { Stats } from '../types'

// ============================================================
// useStats — агрегированная статистика по дням (ключ — локальная дата
// YYYY-MM-DD). record() добавляет завершённую фокус-сессию в сегодняшний
// бакет; селекторы дают сегодня/итоги/стрик/последние N дней.
// ============================================================

export interface DayStat {
  focusMinutes: number
  pomodoros: number
}
export interface DayPoint extends DayStat {
  key: string
  date: Date
}

const ZERO: DayStat = { focusMinutes: 0, pomodoros: 0 }

/** Локальная дата в формате YYYY-MM-DD (без сдвига часового пояса). */
function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function computeStreak(stats: Stats): number {
  const has = (d: Date): boolean => (stats[dayKey(d)]?.pomodoros ?? 0) > 0
  const day = new Date()
  // Если сегодня ещё ничего нет — стрик жив до конца дня, считаем со вчера.
  if (!has(day)) day.setDate(day.getDate() - 1)
  let streak = 0
  while (has(day)) {
    streak++
    day.setDate(day.getDate() - 1)
  }
  return streak
}

export interface StatsApi {
  stats: Stats
  loaded: boolean
  /** Засчитать завершённую фокус-сессию (минуты) в сегодняшний день. */
  record: (minutes: number) => void
  today: DayStat
  streak: number
  totals: DayStat
  /** Последние n дней (от старых к новым, включая сегодня). */
  lastDays: (n: number) => DayPoint[]
}

export function useStats(): StatsApi {
  const [stats, setStats, loaded] = usePersistedState<Stats>(STORAGE_KEYS.stats, {})

  const record = useCallback(
    (minutes: number) => {
      const mins = Math.max(0, Math.round(minutes))
      setStats((prev) => {
        const k = dayKey(new Date())
        const cur = prev[k] ?? ZERO
        return { ...prev, [k]: { focusMinutes: cur.focusMinutes + mins, pomodoros: cur.pomodoros + 1 } }
      })
    },
    [setStats],
  )

  const today = useMemo(() => stats[dayKey(new Date())] ?? ZERO, [stats])
  const streak = useMemo(() => computeStreak(stats), [stats])
  const totals = useMemo(
    () =>
      Object.values(stats).reduce(
        (acc, d) => ({ focusMinutes: acc.focusMinutes + d.focusMinutes, pomodoros: acc.pomodoros + d.pomodoros }),
        { ...ZERO },
      ),
    [stats],
  )

  const lastDays = useCallback(
    (n: number): DayPoint[] => {
      const out: DayPoint[] = []
      const base = new Date()
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(base)
        d.setDate(base.getDate() - i)
        const k = dayKey(d)
        const s = stats[k] ?? ZERO
        out.push({ key: k, date: d, focusMinutes: s.focusMinutes, pomodoros: s.pomodoros })
      }
      return out
    },
    [stats],
  )

  return { stats, loaded, record, today, streak, totals, lastDays }
}
