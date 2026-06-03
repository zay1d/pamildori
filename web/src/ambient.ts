// ============================================================
// ambient.ts — реестр фоновых звуков (дождь, камин и т.д.).
//
// Это статические ассеты, поставляемые с приложением (в отличие от плейлиста,
// который у каждого свой и грузится с бэкенда). Файлы кладём в web/public/sounds/
// — Vite раздаёт их как есть и при сборке копирует в dist/. Звуки играют
// зацикленно и параллельно с плейлистом (отдельные <audio>-элементы).
//
// Чтобы добавить новый звук: положи <id>.mp3 в web/public/sounds/ и допиши
// строку сюда. Нужны зацикленные royalty-free лупы (например CC0 с Pixabay).
// ============================================================

export interface AmbientDef {
  /** Стабильный ключ (он же имя файла без расширения и ключ в сохранённых настройках). */
  id: string
  label: string
  icon: string
  /** Имя файла в web/public/sounds/. */
  file: string
}

export const AMBIENTS: AmbientDef[] = [
  { id: 'rain', label: 'Rain', icon: '🌧', file: 'rain.mp3' },
  { id: 'fire', label: 'Fireplace', icon: '🔥', file: 'fireplace.mp3' },
  { id: 'noise', label: 'White noise', icon: '🌫', file: 'noise.mp3' },
]

/** URL ассета с учётом base (на GitHub Pages приложение живёт в подкаталоге). */
export function ambientUrl(file: string): string {
  return `${import.meta.env.BASE_URL}sounds/${file}`
}
