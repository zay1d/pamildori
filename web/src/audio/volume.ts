// ============================================================
// audio/volume.ts — программная громкость, независимая от системной.
//
// На iOS (Safari / Telegram WebView) HTMLMediaElement.volume ИГНОРИРУЕТСЯ —
// громкостью аудио рулят только аппаратные кнопки телефона. Из-за этого
// слайдеры громкости в вебе «не работают». Чтобы они работали и были
// независимы от громкости телефона (телефон 100%, звук 50%), прогоняем
// элемент через Web Audio GainNode: gain — программное ослабление сигнала,
// и оно действует на iOS.
//
// Нюанс: createMediaElementSource можно вызвать для элемента лишь один раз и
// он перенаправляет вывод в граф — поэтому если AudioContext «suspended»
// (на iOS до юзер-жеста), звука не будет вовсе. Контекст возобновляем из
// обработчика клика через resumeAudio().
// ============================================================

let ctx: AudioContext | null = null
const gains = new WeakMap<HTMLMediaElement, GainNode>()
// Элементы, для которых Web Audio не подошёл → откат на element.volume.
const fallback = new WeakSet<HTMLMediaElement>()

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return ctx
  if (ctx) return ctx
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  return ctx
}

/**
 * Возобновить аудио-контекст. Вызывать ИЗ обработчика клика (юзер-жест) —
 * иначе на iOS контекст останется suspended и звук через граф не пойдёт.
 */
export function resumeAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') void c.resume()
}

/**
 * Громкость элемента (0..1), независимая от системной. Прогоняет элемент через
 * GainNode (один раз) и задаёт gain. Если Web Audio недоступен или элемент уже
 * подключён к другому графу — откат на element.volume.
 *
 * Для кросс-доменного аудио (плейлист с api.pamildori.uz) элементу нужно
 * заранее выставить crossOrigin='anonymous', а серверу — отдавать CORS-заголовки,
 * иначе граф получит тишину.
 */
export function setVolume(el: HTMLMediaElement, vol: number): void {
  const v = Math.max(0, Math.min(1, vol))
  const c = getCtx()
  if (!c || fallback.has(el)) {
    el.volume = v
    return
  }
  let gain = gains.get(el)
  if (!gain) {
    try {
      const source = c.createMediaElementSource(el)
      gain = c.createGain()
      source.connect(gain)
      gain.connect(c.destination)
      gains.set(el, gain)
      // Элемент на максимуме — ослабление делает GainNode.
      el.volume = 1
    } catch {
      fallback.add(el)
      el.volume = v
      return
    }
  }
  gain.gain.value = v
  if (c.state === 'suspended') void c.resume()
}
