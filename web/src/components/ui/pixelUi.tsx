// ============================================================
// pixelUi.tsx — Pamildori pixel chrome (typed React port of
// design-ref/pixel-ui.jsx).
// PIcon, Phone, StatusBar, TabBar, ModeSeg, SealDots, Preset, Ctrl
// ============================================================
import { CSSProperties, ReactNode, useEffect, useState } from 'react'

// --- pixel icon renderer (9x9 grids) ---
export function PIcon({
  g,
  size = 18,
  color = 'currentColor',
}: {
  g: string[]
  size?: number
  color?: string
}): JSX.Element {
  const cells: JSX.Element[] = []
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < g[y].length; x++)
      if (g[y][x] === '1') cells.push(<rect key={x + '-' + y} x={x} y={y} width="1" height="1" />)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 9 9"
      fill={color}
      shapeRendering="crispEdges"
      style={{ display: 'block' }}
    >
      {cells}
    </svg>
  )
}

export const ICON: Record<string, string[]> = {
  timer: ['111111111', '011111110', '001111100', '000111000', '000010000', '000111000', '001111100', '011111110', '111111111'],
  tasks: ['011111100', '010000100', '010111100', '010000100', '010111100', '010000100', '010111100', '010000100', '011111100'],
  stats: ['000000000', '000010000', '000010000', '010010000', '010010010', '010010010', '010010010', '111111111', '000000000'],
  music: ['000011110', '000010010', '000010010', '000010000', '000010000', '011010000', '111110000', '111100000', '011000000'],
  gear: ['000010000', '010111010', '001010100', '111010111', '000101000', '111010111', '001010100', '010111010', '000010000'],
}

export type TabId = 'timer' | 'tasks' | 'stats' | 'playlist' | 'settings'

export function Phone({
  theme = 'night',
  children,
  style = {},
  width = 390,
  height = 844,
}: {
  theme?: 'night' | 'day'
  children: ReactNode
  style?: CSSProperties
  width?: number
  height?: number
}): JSX.Element {
  return (
    <div
      className={`theme-${theme} scanlines`}
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--bg)',
        color: 'var(--ink)',
        borderRadius: 26,
        border: '3px solid #0c0a10',
        boxShadow: '0 24px 70px rgba(0,0,0,0.6), inset 0 0 0 2px var(--line)',
        fontFamily: "'Pixelify Sans', monospace",
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Live HH:MM clock — replaces the design's hardcoded "9:41". */
function useClock(): string {
  const fmt = (): string => {
    const d = new Date()
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
  }
  const [now, setNow] = useState(fmt)
  useEffect(() => {
    const id = window.setInterval(() => setNow(fmt()), 1000 * 15)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function StatusBar({ title = 'PAMILDORI' }: { title?: string }): JSX.Element {
  const clock = useClock()
  return (
    <div style={{ flex: '0 0 auto', paddingTop: 12 }}>
      <div style={{ width: 44, height: 5, background: 'var(--line-2)', margin: '0 auto 8px' }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}
      >
        <span className="font-label" style={{ fontSize: 12, color: 'var(--brass-2)', letterSpacing: '0.18em' }}>
          {title}
        </span>
        <span className="font-num" style={{ fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1 }}>
          {clock}
        </span>
      </div>
    </div>
  )
}

export function TabBar({ active = 'timer', onNav }: { active?: TabId; onNav?: (id: TabId) => void }): JSX.Element {
  const tabs: Array<[TabId, string, string]> = [
    ['timer', 'Timer', 'timer'],
    ['tasks', 'Tasks', 'tasks'],
    ['stats', 'Stats', 'stats'],
    ['playlist', 'Music', 'music'],
    ['settings', 'Set', 'gear'],
  ]
  return (
    <div
      style={{
        flex: '0 0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(5,1fr)',
        gap: 2,
        padding: '8px 8px 20px',
        background: 'linear-gradient(var(--panel-2), var(--panel))',
        borderTop: '3px solid var(--line-2)',
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.05)',
      }}
    >
      {tabs.map(([id, label, ic]) => {
        const on = id === active
        return (
          <button
            key={id}
            onClick={() => onNav && onNav(id)}
            style={{
              border: 'none',
              background: on ? 'var(--panel-hi)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '6px 2px',
              color: on ? 'var(--brass-2)' : 'var(--ink-faint)',
              boxShadow: on
                ? 'inset 2px 2px 0 rgba(255,255,255,0.08), inset -2px -2px 0 rgba(0,0,0,0.3)'
                : 'none',
            }}
          >
            <PIcon g={ICON[ic]} size={20} />
            <span className="font-label" style={{ fontSize: 8, letterSpacing: '0.06em' }}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export type Mode = 'focus' | 'short' | 'long'

export function ModeSeg({ active = 'focus', onChange }: { active?: Mode; onChange?: (id: Mode) => void }): JSX.Element {
  const modes: Array<[Mode, string]> = [
    ['focus', 'Focus'],
    ['short', 'Short'],
    ['long', 'Long'],
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5 }}>
      {modes.map(([id, label]) => {
        const on = id === active
        return (
          <button
            key={id}
            onClick={() => onChange && onChange(id)}
            className={on ? 'pf-brass' : 'pf'}
            style={{
              padding: '8px 4px',
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: 14,
              fontWeight: 600,
              color: on ? '#221603' : 'var(--ink-soft)',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

// wax-seal pixel cycle dots
export function SealDots({ total = 4, done = 2, size = 16 }: { total?: number; done?: number; size?: number }): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const f = i < done
        return (
          <span
            key={i}
            style={{
              width: size,
              height: size,
              display: 'inline-block',
              position: 'relative',
              background: f ? 'var(--crimson)' : 'transparent',
              border: f ? '2px solid var(--crimson-2)' : '2px solid var(--line-2)',
              boxShadow: f
                ? 'inset -2px -2px 0 rgba(0,0,0,0.35), inset 2px 2px 0 rgba(255,255,255,0.12)'
                : 'none',
            }}
          >
            {f && (
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  margin: 'auto',
                  width: 4,
                  height: 4,
                  background: 'var(--brass-2)',
                }}
              />
            )}
          </span>
        )
      })}
    </div>
  )
}

export function Preset({
  presets = [5, 15, 30, 60],
  active = 25,
  onPick,
  onCustom,
}: {
  presets?: number[]
  active?: number
  onPick?: (p: number) => void
  onCustom?: () => void
}): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {presets.map((p) => {
        const on = p === active
        return (
          <button
            key={p}
            onClick={() => onPick && onPick(p)}
            className={on ? 'pf-raised' : 'pf'}
            style={{
              flex: 1,
              padding: '7px 0',
              fontFamily: "'Pixelify Sans', monospace",
              fontSize: 15,
              fontWeight: 600,
              color: on ? 'var(--brass-2)' : 'var(--ink-soft)',
            }}
          >
            {p}
            <span style={{ fontSize: 10, opacity: 0.7 }}>m</span>
          </button>
        )
      })}
      <button
        className="pf"
        onClick={() => onCustom && onCustom()}
        style={{ width: 40, padding: '7px 0', color: 'var(--ink-faint)', fontSize: 14 }}
        title="Custom"
      >
        ✎
      </button>
    </div>
  )
}

export function Ctrl({
  kind = 'ghost',
  icon,
  label,
  onClick,
}: {
  kind?: 'ghost' | 'primary'
  icon: string
  label: string
  onClick?: () => void
}): JSX.Element {
  const primary = kind === 'primary'
  return (
    <button
      onClick={onClick}
      className={primary ? 'pf-brass' : 'pf-raised'}
      style={{
        width: primary ? 104 : 62,
        height: 58,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        color: primary ? '#221603' : 'var(--ink-soft)',
      }}
    >
      <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: primary ? 14 : 12, lineHeight: 1 }}>
        {icon}
      </span>
      <span className="font-label" style={{ fontSize: 8 }}>
        {label}
      </span>
    </button>
  )
}
