// ============================================================
// PixelCanvas.tsx — React wrappers around the framework-free
// pixelArt renderers. A single shared rAF ticker drives all
// canvases (cheap). Honors `prefers-reduced-motion`: when the
// user prefers reduced motion we render a single static frame
// instead of animating.
//
//   <PixelScene res={[208, 176]} state={{ timeofday, weather, theme, ... }} />
//   <PixelRobot res={[72, 96]} state={{ state, costumes, mmss, theme }} />
// ============================================================
import { CSSProperties, useEffect, useRef } from 'react'
import { drawRobot, drawScene, RobotStateObj, SceneState } from '../render/pixelArt'

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void

// ---- shared ticker ----
const _pmTick = (() => {
  const subs = new Set<(t: number) => void>()
  let running = false
  const start = performance.now()
  function loop(now: number): void {
    const t = (now - start) / 1000
    subs.forEach((fn) => {
      try {
        fn(t)
      } catch {
        /* keep other subscribers alive */
      }
    })
    if (subs.size) requestAnimationFrame(loop)
    else running = false
  }
  return {
    add(fn: (t: number) => void): void {
      subs.add(fn)
      if (!running) {
        running = true
        requestAnimationFrame(loop)
      }
    },
    remove(fn: (t: number) => void): void {
      subs.delete(fn)
    },
  }
})()

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/**
 * Sets up a pixel canvas at a fixed internal resolution and drives `draw`.
 * If the user prefers reduced motion, draws a single frame (t = 0) and
 * skips the rAF subscription entirely.
 */
export function usePixelCanvas(
  resW: number,
  resH: number,
  draw: DrawFn,
): React.RefObject<HTMLCanvasElement> {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    cv.width = resW
    cv.height = resH
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = false

    if (prefersReducedMotion()) {
      drawRef.current(ctx, resW, resH, 0)
      return
    }
    const fn = (t: number): void => drawRef.current(ctx, resW, resH, t)
    _pmTick.add(fn)
    return () => _pmTick.remove(fn)
  }, [resW, resH])

  return ref
}

interface CanvasProps<S> {
  res?: [number, number]
  state?: S
  style?: CSSProperties
  className?: string
}

export function PixelScene({
  res = [208, 176],
  state = {},
  style = {},
  className = '',
}: CanvasProps<SceneState>): JSX.Element {
  const [W, H] = res
  const stateRef = useRef(state)
  stateRef.current = state
  const ref = usePixelCanvas(W, H, (ctx, w, h, t) => {
    drawScene(ctx, w, h, { ...stateRef.current, t })
  })
  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated', ...style }}
    />
  )
}

export function PixelRobot({
  res = [72, 96],
  state = {},
  style = {},
  className = '',
}: CanvasProps<RobotStateObj>): JSX.Element {
  const [W, H] = res
  const stateRef = useRef(state)
  stateRef.current = state
  const ref = usePixelCanvas(W, H, (ctx, w, h, t) => {
    drawRobot(ctx, w, h, { ...stateRef.current, t })
  })
  return (
    <canvas
      ref={ref}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated', ...style }}
    />
  )
}
