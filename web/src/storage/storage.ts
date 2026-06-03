import { tg } from '../telegram'

// Асинхронный слой хранения «ключ → JSON».
//
// Сейчас работают два бэкенда:
//   • localStorage  — обычный веб
//   • Telegram CloudStorage — внутри Mini App (синхронизация между устройствами)
//
// Интерфейс намеренно асинхронный, чтобы позже можно было без изменений
// в остальном коде подменить его на HTTP-бэкенд (fetch к своему API).

export interface StorageBackend {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

const PREFIX = 'pamildori:'

const localBackend: StorageBackend = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  },
  async remove(key: string): Promise<void> {
    localStorage.removeItem(PREFIX + key)
  },
}

const cloudBackend: StorageBackend = {
  get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      tg!.CloudStorage!.getItem(key, (err, value) => {
        if (err || !value) return resolve(null)
        try {
          resolve(JSON.parse(value) as T)
        } catch {
          resolve(null)
        }
      })
    })
  },
  set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      tg!.CloudStorage!.setItem(key, JSON.stringify(value), () => resolve())
    })
  },
  remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      tg!.CloudStorage!.removeItem(key, () => resolve())
    })
  },
}

export const storage: StorageBackend =
  tg?.CloudStorage ? cloudBackend : localBackend

export const STORAGE_KEYS = {
  settings: 'settings',
  tasks: 'tasks',
  stats: 'stats',
  activeTask: 'activeTask',
  player: 'player',
} as const
