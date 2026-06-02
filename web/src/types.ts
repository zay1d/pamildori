export type Phase = 'focus' | 'shortBreak' | 'longBreak'

export type TimerStatus = 'idle' | 'running' | 'paused'

export interface Settings {
  /** Длительность рабочего интервала, минут. */
  focusMin: number
  /** Короткий перерыв, минут. */
  shortBreakMin: number
  /** Длинный перерыв, минут. */
  longBreakMin: number
  /** Через сколько помодоро делать длинный перерыв. */
  longBreakEvery: number
  /** Автоматически запускать перерывы после работы. */
  autoStartBreaks: boolean
  /** Автоматически запускать работу после перерыва. */
  autoStartFocus: boolean
  /** Звук по окончании интервала. */
  soundEnabled: boolean
  /** Тема оформления. */
  theme: 'system' | 'light' | 'dark'
  /** Погода за окном сцены. */
  weather: 'clear' | 'cloudy' | 'rain' | 'storm'
  /** Режим времени суток: фиксированный день/ночь или авто по часам. */
  timeMode: 'day' | 'night' | 'auto'
}

export interface Task {
  id: string
  title: string
  /** Сколько помодоро запланировано. */
  estimate: number
  /** Сколько помодоро уже сделано по задаче. */
  done: number
  completed: boolean
  createdAt: number
}

/** Агрегированная статистика по дням: ключ — дата YYYY-MM-DD. */
export type Stats = Record<
  string,
  {
    focusMinutes: number
    pomodoros: number
  }
>

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  longBreakEvery: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  theme: 'system',
  weather: 'clear',
  timeMode: 'auto',
}
