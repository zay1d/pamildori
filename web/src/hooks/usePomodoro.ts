import { useCallback, useEffect, useRef, useState } from 'react'
import { Phase, Settings } from '../types'
import { haptic } from '../telegram'
import type { Mode } from '../components/ui/pixelUi'

// ============================================================
// usePomodoro — таймстамп-ориентированный таймер Помодоро.
//
// Оставшееся время вычисляется из абсолютной отметки конца (`endAt`),
// поэтому таймер не «отстаёт», когда вкладка свёрнута. setInterval
// тикает ~4×/сек только для отрисовки.
// ============================================================

export type Status = 'idle' | 'running' | 'paused'

/** UI-режим сегмента ↔ фаза домена. */
const phaseOf = (mode: Mode): Phase =>
  mode === 'focus' ? 'focus' : mode === 'short' ? 'shortBreak' : 'longBreak'

export interface PomodoroState {
  mode: Mode
  status: Status
  /** Оставшиеся секунды (целое, для отображения). */
  remaining: number
  /** Полная длительность текущей фазы, секунд. */
  duration: number
  /** Завершённых фокус-сессий в текущем цикле (0..longBreakEvery). */
  cycle: number
  /** MM:SS для часов-животика робота. */
  mmss: string
}

export interface PomodoroApi extends PomodoroState {
  start: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  skip: () => void
  setMode: (m: Mode) => void
  /** Установить длительность фокуса (минуты) — для пресетов/кастома. */
  setFocusMinutes: (min: number) => void
}

const TICK_MS = 250

function fmt(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const m = Math.floor(s / 60)
  const r = s % 60
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0')
}

/** Короткий beep через WebAudio — без внешних файлов. */
function beep(): void {
  try {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.value = 660
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.36)
    osc.onended = () => ctx.close()
  } catch {
    /* аудио недоступно — молча игнорируем */
  }
}

/**
 * @param settings  актуальные настройки (длительности, авто-старт, звук…)
 * @param onFocusComplete колбэк при завершении фокус-сессии (для статистики/задач — хук для будущих юнитов)
 */
export function usePomodoro(
  settings: Settings,
  onFocusComplete?: (minutes: number) => void,
): PomodoroApi {
  const [mode, setModeState] = useState<Mode>('focus')
  const [status, setStatus] = useState<Status>('idle')
  const [cycle, setCycle] = useState(0)
  // remaining в миллисекундах: при idle/paused держим «замороженное» значение,
  // при running вычисляем из endAt.
  const [endAt, setEndAt] = useState<number | null>(null)
  const [frozenMs, setFrozenMs] = useState<number>(settings.focusMin * 60_000)
  // tick — просто заставляет компонент перерисовываться при running.
  const [, setTick] = useState(0)

  const durationMs = useCallback(
    (m: Mode): number => {
      const min =
        m === 'focus' ? settings.focusMin : m === 'short' ? settings.shortBreakMin : settings.longBreakMin
      return Math.max(1, min) * 60_000
    },
    [settings.focusMin, settings.shortBreakMin, settings.longBreakMin],
  )

  // Свежие значения для использования внутри таймера/обработчика завершения.
  const onFocusCompleteRef = useRef(onFocusComplete)
  onFocusCompleteRef.current = onFocusComplete
  const soundRef = useRef(settings.soundEnabled)
  soundRef.current = settings.soundEnabled

  const remainingMs = status === 'running' && endAt !== null ? Math.max(0, endAt - Date.now()) : frozenMs

  const start = useCallback(() => {
    setStatus((s) => {
      if (s === 'running') return s
      // Возобновляем из замороженного остатка (или старт с полной длительности).
      setEndAt(Date.now() + frozenMs)
      return 'running'
    })
  }, [frozenMs])

  const pause = useCallback(() => {
    setStatus((s) => {
      if (s !== 'running') return s
      setEndAt((e) => {
        setFrozenMs(Math.max(0, (e ?? Date.now()) - Date.now()))
        return null
      })
      return 'paused'
    })
  }, [])

  const toggle = useCallback(() => {
    if (status === 'running') pause()
    else start()
  }, [status, start, pause])

  const reset = useCallback(() => {
    setStatus('idle')
    setEndAt(null)
    setFrozenMs(durationMs(mode))
  }, [durationMs, mode])

  const setMode = useCallback(
    (m: Mode) => {
      setModeState(m)
      setStatus('idle')
      setEndAt(null)
      setFrozenMs(durationMs(m))
    },
    [durationMs],
  )

  const setFocusMinutes = useCallback(
    (min: number) => {
      // Пресет/кастом задаёт длительность фокуса и переключает в фокус,
      // сбрасывая таймер. min уже валидируется/клампится вызывающей стороной.
      const next = Math.max(1, min)
      // Тап по уже активному значению в фокус-режиме — ничего не делаем
      // (не сбрасываем прогресс). Текущая длительность фокуса берётся из того же
      // источника, что и подсветка пресета в UI (durationMs('focus')).
      const currentFocusMin = Math.round(durationMs('focus') / 60_000)
      if (mode === 'focus' && next === currentFocusMin) return
      setModeState('focus')
      setStatus('idle')
      setEndAt(null)
      setFrozenMs(next * 60_000)
    },
    [mode, durationMs],
  )

  // Переход к следующей фазе.
  // credited=true — естественное завершение (зачёт фокуса, звук, инкремент цикла);
  // credited=false — Skip (просто переход к следующей фазе без зачёта).
  const advance = useCallback(
    (credited: boolean) => {
      if (credited) {
        if (soundRef.current) beep()
        haptic('success')
      }

      if (phaseOf(mode) === 'focus') {
        let nextMode: Mode = 'short'
        if (credited) {
          // Зачёт фокус-сессии → инкремент цикла, выбор перерыва.
          const focusMinutes = Math.round(durationMs('focus') / 60_000)
          onFocusCompleteRef.current?.(focusMinutes)
          const nextCycle = cycle + 1
          const isLong = nextCycle >= settings.longBreakEvery
          // Не сбрасываем cycle при входе в длинный перерыв — точки должны
          // оставаться полными во время отдыха. Сброс произойдёт при выходе.
          setCycle(nextCycle)
          nextMode = isLong ? 'long' : 'short'
        }
        // Skip фокуса всегда ведёт в короткий перерыв и не толкает к длинному.
        setModeState(nextMode)
        const dur = durationMs(nextMode)
        setFrozenMs(dur)
        if (settings.autoStartBreaks) {
          setEndAt(Date.now() + dur)
          setStatus('running')
        } else {
          setEndAt(null)
          setStatus('idle')
        }
      } else {
        // Перерыв закончился → к фокусу.
        // Выход из длинного перерыва завершает цикл — сбрасываем счётчик.
        if (mode === 'long') setCycle(0)
        setModeState('focus')
        const dur = durationMs('focus')
        setFrozenMs(dur)
        if (settings.autoStartFocus) {
          setEndAt(Date.now() + dur)
          setStatus('running')
        } else {
          setEndAt(null)
          setStatus('idle')
        }
      }
    },
    [mode, cycle, durationMs, settings.longBreakEvery, settings.autoStartBreaks, settings.autoStartFocus],
  )

  // Тикер: пока running, перерисовываем и ловим момент завершения.
  useEffect(() => {
    if (status !== 'running' || endAt === null) return
    const id = window.setInterval(() => {
      if (Date.now() >= endAt) {
        advance(true)
      } else {
        setTick((n) => (n + 1) % 1_000_000)
      }
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [status, endAt, advance])

  // Если меняются длительности в настройках, а таймер не запущен —
  // подтягиваем замороженное значение под текущий режим.
  useEffect(() => {
    if (status === 'idle') {
      setFrozenMs(durationMs(mode))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.focusMin, settings.shortBreakMin, settings.longBreakMin])

  const remaining = Math.round(remainingMs / 1000)
  return {
    mode,
    status,
    remaining,
    duration: Math.round(durationMs(mode) / 1000),
    cycle,
    mmss: fmt(remaining),
    start,
    pause,
    toggle,
    reset,
    skip: () => advance(false),
    setMode,
    setFocusMinutes,
  }
}
