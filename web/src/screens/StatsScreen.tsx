// ============================================================
// StatsScreen.tsx — статистика (pixel / dark-academia edition).
// Сегодня (помодоро/фокус-минуты + прогресс к дневной цели), стрик,
// недельный бар-чарт и итоги (неделя / всего).
// ============================================================
import type { ReactNode } from 'react'
import type { StatsApi } from '../hooks/useStats'

function hm(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }): JSX.Element {
  return (
    <div className="pf" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {children}
    </div>
  )
}

function BigStat({ value, label, accent }: { value: string; label: string; accent?: boolean }): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', flex: 1 }}>
      <span className="font-num" style={{ fontSize: 30, lineHeight: 1, color: accent ? 'var(--brass-2)' : 'var(--ink)' }}>
        {value}
      </span>
      <span className="font-label" style={{ fontSize: 8, color: 'var(--ink-faint)' }}>
        {label}
      </span>
    </div>
  )
}

/** Полоса прогресса к дневной цели. */
function Goal({ done, goal }: { done: number; goal: number }): JSX.Element {
  const pct = Math.max(0, Math.min(1, goal > 0 ? done / goal : 0))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="font-label" style={{ fontSize: 8, color: 'var(--ink-faint)' }}>
          Daily goal
        </span>
        <span className="font-ui" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          {done} / {goal} 🍅
        </span>
      </div>
      <div className="pf-inset" style={{ height: 14, padding: 2 }}>
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            minWidth: pct > 0 ? 4 : 0,
            background: pct >= 1 ? 'var(--brass-2)' : 'var(--crimson)',
            boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.2), inset -1px -1px 0 rgba(0,0,0,0.35)',
          }}
        />
      </div>
    </div>
  )
}

/** Недельный бар-чарт (помодоро по дням). */
function WeekChart({ days, todayKey }: { days: ReturnType<StatsApi['lastDays']>; todayKey: string }): JSX.Element {
  const max = Math.max(1, ...days.map((d) => d.pomodoros))
  const wd = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, height: 110 }}>
      {days.map((d) => {
        const isToday = d.key === todayKey
        const h = d.pomodoros > 0 ? Math.max(6, Math.round((d.pomodoros / max) * 78)) : 2
        return (
          <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <span className="font-ui" style={{ fontSize: 11, color: d.pomodoros > 0 ? 'var(--brass-2)' : 'var(--ink-faint)' }}>
              {d.pomodoros || ''}
            </span>
            <div
              title={`${d.pomodoros}🍅 · ${hm(d.focusMinutes)}`}
              style={{
                width: '100%',
                height: h,
                background: d.pomodoros > 0 ? (isToday ? 'var(--brass)' : 'var(--crimson)') : 'var(--line)',
                boxShadow: d.pomodoros > 0 ? 'inset 1px 1px 0 rgba(255,255,255,0.18), inset -1px -1px 0 rgba(0,0,0,0.35)' : 'none',
              }}
            />
            <span className="font-label" style={{ fontSize: 8, color: isToday ? 'var(--brass-2)' : 'var(--ink-faint)' }}>
              {wd[d.date.getDay()]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function StatsScreen({ stats, dailyGoal }: { stats: StatsApi; dailyGoal: number }): JSX.Element {
  const days = stats.lastDays(7)
  const todayKey = days[days.length - 1]?.key ?? ''
  const week = days.reduce(
    (a, d) => ({ pomodoros: a.pomodoros + d.pomodoros, focusMinutes: a.focusMinutes + d.focusMinutes }),
    { pomodoros: 0, focusMinutes: 0 },
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 16px 0', gap: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="font-disp" style={{ fontSize: 14, color: 'var(--brass-2)' }}>
          Statistics
        </span>
        <span className="font-label" style={{ fontSize: 9, color: 'var(--ink-faint)' }}>
          🔥 {stats.streak} day{stats.streak === 1 ? '' : 's'}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14 }}>
        {/* today */}
        <Card>
          <span className="font-label" style={{ fontSize: 8, color: 'var(--brass-2)' }}>
            Today
          </span>
          <div style={{ display: 'flex', gap: 8, margin: '2px 0 6px' }}>
            <BigStat value={String(stats.today.pomodoros)} label="pomodoros" accent />
            <BigStat value={hm(stats.today.focusMinutes)} label="focused" />
          </div>
          <Goal done={stats.today.pomodoros} goal={dailyGoal} />
        </Card>

        {/* week chart */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="font-label" style={{ fontSize: 8, color: 'var(--brass-2)' }}>
              This week
            </span>
            <span className="font-ui" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              {week.pomodoros}🍅 · {hm(week.focusMinutes)}
            </span>
          </div>
          <WeekChart days={days} todayKey={todayKey} />
        </Card>

        {/* totals */}
        <Card>
          <span className="font-label" style={{ fontSize: 8, color: 'var(--brass-2)' }}>
            All time
          </span>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <BigStat value={String(stats.totals.pomodoros)} label="pomodoros" accent />
            <BigStat value={hm(stats.totals.focusMinutes)} label="focused" />
          </div>
        </Card>
      </div>
    </div>
  )
}
