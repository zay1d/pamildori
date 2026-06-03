// ============================================================
// TimerScreen.tsx — функциональный экран Таймера (pixel edition).
// Сцена за окном + робот спереди, подпись, цикл-точки, режимы,
// пресеты с кастомным вводом и ряд управления.
// ============================================================
import { useState } from 'react'
import { PixelRobot, PixelScene } from '../components/PixelCanvas'
import { Ctrl, ModeSeg, Preset, SealDots } from '../components/ui/pixelUi'
import type { Mode } from '../components/ui/pixelUi'
import { usePomodoro } from '../hooks/usePomodoro'
import { useTheme } from '../hooks/useTheme'
import { Settings, Task } from '../types'
import type { Costume, RobotState } from '../render/pixelArt'

function TaskChip({ label }: { label: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        className="pf"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: '92%',
          padding: '5px 12px',
          background: 'var(--panel)',
        }}
      >
        <span style={{ color: 'var(--brass)', fontSize: 12 }}>❦</span>
        <span
          className="font-ui"
          style={{
            fontSize: 14,
            color: 'var(--ink-soft)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}

function TimerHero({
  scene,
  robot,
}: {
  scene: Parameters<typeof PixelScene>[0]['state']
  robot: Parameters<typeof PixelRobot>[0]['state']
}): JSX.Element {
  return (
    <div style={{ position: 'relative', height: 300 }}>
      <div
        className="pf-inset"
        style={{ position: 'absolute', top: 0, left: 6, right: 6, bottom: 8, overflow: 'hidden', padding: 0 }}
      >
        <PixelScene res={[208, 176]} state={scene} />
      </div>
      <div style={{ position: 'absolute', left: '50%', bottom: 44, transform: 'translateX(-50%)', width: 168, height: 224 }}>
        <PixelRobot res={[72, 96]} state={robot} />
      </div>
    </div>
  )
}

/** Маппинг режим+статус → состояние робота. */
function robotStateFor(mode: Mode, status: string): RobotState {
  if (mode === 'focus') return status === 'running' ? 'focus' : 'idle'
  // перерывы
  return status === 'running' ? 'break' : 'idle'
}

const PRESETS = [5, 15, 30, 60]

export function TimerScreen({
  settings,
  activeTask = null,
  onFocusComplete,
  musicPlaying = false,
}: {
  settings: Settings
  activeTask?: Task | null
  onFocusComplete?: (minutes: number) => void
  musicPlaying?: boolean
}): JSX.Element {
  const { theme, timeofday } = useTheme(settings)
  const timer = usePomodoro(settings, onFocusComplete)
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')

  const total = Math.max(1, settings.longBreakEvery)
  const focusMin = Math.round(timer.duration / 60)
  // Активный пресет — только в фокус-режиме, если совпадает.
  const activePreset = timer.mode === 'focus' && PRESETS.includes(focusMin) ? focusMin : -1

  // Костюмы: ночной колпак при тёмной теме + наушники, когда играет музыка.
  const costumes: Costume[] = []
  if (theme === 'night') costumes.push('nightcap')
  if (musicPlaying) costumes.push('headphones')

  const scene = { theme, timeofday, weather: settings.weather, fireplace: true, drape: true }
  const robot = { theme, state: robotStateFor(timer.mode, timer.status), costumes, mmss: timer.mmss }

  const caption =
    timer.mode === 'focus' ? 'Focus Session' : timer.mode === 'short' ? 'Short Rest' : 'Long Rest'

  const applyCustom = (): void => {
    const n = Math.floor(Number(customValue))
    if (Number.isFinite(n) && n >= 1) {
      timer.setFocusMinutes(Math.min(180, n))
    }
    setCustomOpen(false)
    setCustomValue('')
  }

  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 16px 0', gap: 11, overflow: 'hidden' }}>
        {activeTask ? <TaskChip label={activeTask.title} /> : <div style={{ height: 30 }} />}
        <TimerHero scene={scene} robot={robot} />

        {/* caption + cycle */}
        <div style={{ textAlign: 'center', marginTop: -6 }}>
          <div className="font-label" style={{ fontSize: 10, color: 'var(--brass-2)', marginBottom: 8 }}>
            ✦&nbsp; {caption} &nbsp;✦
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SealDots total={total} done={Math.min(total, Math.max(0, timer.cycle))} />
          </div>
        </div>

        <ModeSeg active={timer.mode} onChange={timer.setMode} />

        {customOpen ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              autoFocus
              type="number"
              min={1}
              max={180}
              inputMode="numeric"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyCustom()
                if (e.key === 'Escape') {
                  setCustomOpen(false)
                  setCustomValue('')
                }
              }}
              placeholder="1–180 min"
              className="pf-inset"
              style={{
                flex: 1,
                padding: '7px 10px',
                fontFamily: "'DotGothic16', monospace",
                fontSize: 15,
                color: 'var(--ink)',
                background: 'var(--bg)',
                border: '2px solid var(--bg-2)',
                outline: 'none',
              }}
            />
            <button
              className="pf-brass"
              onClick={applyCustom}
              style={{ padding: '7px 12px', fontFamily: "'DotGothic16', monospace", fontSize: 14, fontWeight: 600 }}
            >
              Set
            </button>
          </div>
        ) : (
          <Preset
            presets={PRESETS}
            active={activePreset}
            onPick={(p) => timer.setFocusMinutes(p)}
            onCustom={() => setCustomOpen(true)}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 2 }}>
          <Ctrl kind="ghost" icon="↺" label="Reset" onClick={timer.reset} />
          <Ctrl
            kind="primary"
            icon={timer.status === 'running' ? '❚❚' : '▶'}
            label={timer.status === 'running' ? 'Pause' : 'Start'}
            onClick={timer.toggle}
          />
          <Ctrl kind="ghost" icon="⏭" label="Skip" onClick={timer.skip} />
        </div>
      </div>
    </>
  )
}
