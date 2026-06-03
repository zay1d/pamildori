// ============================================================
// SettingsScreen.tsx — настройки (pixel / dark-academia edition).
// Длительности, авто-старт, звук, тема (День/Ночь/Авто), погода,
// дневная цель. Все изменения сразу сохраняются и питают таймер/сцену.
// ============================================================
import type { CSSProperties, ReactNode } from 'react'
import type { Settings } from '../types'
import { tg } from '../telegram'

// ---------- reusable pixel controls ----------

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="font-label" style={{ fontSize: 9, color: 'var(--brass-2)', margin: '4px 2px 0' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

/** Ряд «подпись слева — контрол справа». */
function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div
      className="pf"
      style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
    >
      <span className="font-ui" style={{ fontSize: 14, color: 'var(--ink)' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

/** Блок «подпись сверху — контрол на всю ширину снизу» (для сегментов). */
function Stack({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="pf" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span className="font-ui" style={{ fontSize: 14, color: 'var(--ink)' }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function Num({
  value,
  min,
  max,
  suffix = '',
  onChange,
}: {
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (n: number) => void
}): JSX.Element {
  const btn: CSSProperties = {
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DotGothic16', monospace",
    fontSize: 16,
    color: 'var(--ink-soft)',
    lineHeight: 1,
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button className="pf" style={btn} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Less">
        −
      </button>
      <span className="font-num" style={{ minWidth: 46, textAlign: 'center', fontSize: 18, color: 'var(--brass-2)' }}>
        {value}
        {suffix}
      </span>
      <button className="pf" style={btn} onClick={() => onChange(Math.min(max, value + 1))} aria-label="More">
        +
      </button>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (b: boolean) => void }): JSX.Element {
  return (
    <button
      className="pf-inset"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{ position: 'relative', width: 50, height: 26, padding: 0, flex: '0 0 auto', cursor: 'pointer' }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          bottom: 2,
          width: 20,
          left: on ? 26 : 3,
          background: on ? 'var(--brass-2)' : 'var(--line-2)',
          boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.3), inset -1px -1px 0 rgba(0,0,0,0.4)',
        }}
      />
    </button>
  )
}

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<[T, string]>
  onChange: (v: T) => void
}): JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length},1fr)`, gap: 5 }}>
      {options.map(([v, label]) => {
        const on = v === value
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={on ? 'pf-brass' : 'pf'}
            style={{
              padding: '7px 2px',
              fontFamily: "'DotGothic16', monospace",
              fontSize: 13,
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

// ---------- screen ----------

export function SettingsScreen({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
}): JSX.Element {
  const user = tg?.initDataUnsafe?.user
  const name = user?.first_name || user?.username || 'Guest scholar'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 16px 0', gap: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="font-disp" style={{ fontSize: 14, color: 'var(--brass-2)' }}>
          Settings
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14 }}>
        {/* profile */}
        <div className="pf-raised" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 34,
              height: 34,
              flex: '0 0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--panel)',
              color: 'var(--brass-2)',
              fontFamily: "'Jersey 25', monospace",
              fontSize: 14,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span className="font-ui" style={{ fontSize: 15, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </span>
            <span className="font-label" style={{ fontSize: 8, color: 'var(--ink-faint)' }}>
              {user ? 'Telegram' : 'Local'}
            </span>
          </div>
        </div>

        <Section title="Intervals">
          <Row label="Focus">
            <Num value={settings.focusMin} min={1} max={180} suffix="m" onChange={(n) => onChange({ focusMin: n })} />
          </Row>
          <Row label="Short break">
            <Num value={settings.shortBreakMin} min={1} max={60} suffix="m" onChange={(n) => onChange({ shortBreakMin: n })} />
          </Row>
          <Row label="Long break">
            <Num value={settings.longBreakMin} min={1} max={60} suffix="m" onChange={(n) => onChange({ longBreakMin: n })} />
          </Row>
          <Row label="Long break every">
            <Num value={settings.longBreakEvery} min={2} max={12} suffix="🍅" onChange={(n) => onChange({ longBreakEvery: n })} />
          </Row>
        </Section>

        <Section title="Automation">
          <Row label="Auto-start breaks">
            <Toggle on={settings.autoStartBreaks} onChange={(b) => onChange({ autoStartBreaks: b })} />
          </Row>
          <Row label="Auto-start focus">
            <Toggle on={settings.autoStartFocus} onChange={(b) => onChange({ autoStartFocus: b })} />
          </Row>
          <Row label="Sound when done">
            <Toggle on={settings.soundEnabled} onChange={(b) => onChange({ soundEnabled: b })} />
          </Row>
        </Section>

        <Section title="Scene">
          <Stack label="Theme">
            <Seg
              value={settings.timeMode}
              options={[
                ['auto', 'Auto'],
                ['day', 'Day'],
                ['night', 'Night'],
              ]}
              onChange={(v) => onChange({ timeMode: v })}
            />
          </Stack>
          <Stack label="Weather">
            <Seg
              value={settings.weather}
              options={[
                ['clear', 'Clear'],
                ['cloudy', 'Cloudy'],
                ['rain', 'Rain'],
                ['storm', 'Storm'],
              ]}
              onChange={(v) => onChange({ weather: v })}
            />
          </Stack>
        </Section>

        <Section title="Goal">
          <Row label="Daily goal">
            <Num value={settings.dailyGoal} min={1} max={20} suffix="🍅" onChange={(n) => onChange({ dailyGoal: n })} />
          </Row>
        </Section>
      </div>
    </div>
  )
}
