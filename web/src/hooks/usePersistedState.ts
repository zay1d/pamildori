import { useEffect, useRef, useState } from 'react'
import { storage } from '../storage/storage'

/**
 * Состояние, которое автоматически загружается из хранилища при монтировании
 * и сохраняется при каждом изменении. Возвращает также флаг `loaded`,
 * чтобы не перезаписать данные значением по умолчанию до их загрузки.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial)
  const [loaded, setLoaded] = useState(false)
  // Не сохраняем самое первое значение (значение по умолчанию) обратно.
  const skipNextSave = useRef(true)

  useEffect(() => {
    let cancelled = false
    storage.get<T>(key).then((stored) => {
      if (cancelled) return
      if (stored !== null) {
        skipNextSave.current = true
        setValue(stored)
      }
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [key])

  useEffect(() => {
    if (!loaded) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }
    void storage.set(key, value)
  }, [key, value, loaded])

  return [value, setValue, loaded]
}
