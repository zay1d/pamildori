import { usePersistedState } from './usePersistedState'
import { STORAGE_KEYS } from '../storage/storage'
import { DEFAULT_SETTINGS, Settings } from '../types'

/**
 * Настройки приложения с автосохранением.
 * Сливаем загруженное значение с DEFAULT_SETTINGS, чтобы новые поля
 * (добавленные в более поздних версиях) не были `undefined` у старых
 * пользователей.
 */
export function useSettings(): [Settings, React.Dispatch<React.SetStateAction<Settings>>, boolean] {
  const [stored, setStored, loaded] = usePersistedState<Settings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stored }
  return [settings, setStored, loaded]
}
