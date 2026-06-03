// Минимальная типизация и хелперы для Telegram Mini App SDK.
// Всё через feature-detection, чтобы тот же код работал и в обычном вебе.

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  /** Bot API 8.0+: настоящий полноэкранный режим на мобильных. */
  requestFullscreen?: () => void
  /** Bot API 7.7+: отключить вертикальные свайпы (чтобы скролл не закрывал апп). */
  disableVerticalSwipes?: () => void
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  initData: string
  initDataUnsafe: { user?: { id: number; first_name?: string; username?: string } }
  onEvent: (event: string, handler: () => void) => void
  offEvent: (event: string, handler: () => void) => void
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  }
  CloudStorage?: {
    getItem: (key: string, cb: (err: string | null, value: string | null) => void) => void
    setItem: (key: string, value: string, cb?: (err: string | null, ok: boolean) => void) => void
    removeItem: (key: string, cb?: (err: string | null, ok: boolean) => void) => void
    getKeys: (cb: (err: string | null, keys: string[]) => void) => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

export const tg: TelegramWebApp | undefined =
  typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

export const isTelegram = (): boolean => Boolean(tg && tg.initData !== undefined)

/** Инициализация Mini App: готовность + разворот на весь экран. */
export function initTelegram(): void {
  if (!tg) return
  tg.ready()
  tg.expand() // полная высота (убирает «половинное» открытие)
  // Настоящий fullscreen — только если клиент поддерживает (Bot API 8.0+).
  try {
    tg.requestFullscreen?.()
  } catch {
    /* старый клиент — остаёмся на expand() */
  }
  // Чтобы вертикальный скролл по контенту не закрывал апп случайно.
  try {
    tg.disableVerticalSwipes?.()
  } catch {
    /* метод недоступен — игнорируем */
  }
}

/** Лёгкая тактильная отдача (если доступна) — приятно на телефоне. */
export function haptic(type: 'success' | 'tick' = 'tick'): void {
  if (!tg?.HapticFeedback) return
  if (type === 'success') tg.HapticFeedback.notificationOccurred('success')
  else tg.HapticFeedback.impactOccurred('light')
}

/** Применяет тему Telegram к CSS-переменным, если запущены внутри клиента. */
export function applyTelegramTheme(): 'light' | 'dark' | null {
  if (!tg) return null
  const p = tg.themeParams
  const root = document.documentElement.style
  if (p.bg_color) root.setProperty('--tg-bg', p.bg_color)
  if (p.text_color) root.setProperty('--tg-text', p.text_color)
  if (p.hint_color) root.setProperty('--tg-hint', p.hint_color)
  if (p.secondary_bg_color) root.setProperty('--tg-secondary-bg', p.secondary_bg_color)
  return tg.colorScheme
}
