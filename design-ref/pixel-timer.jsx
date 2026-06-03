// ============================================================
// pixel-timer.jsx — the main Timer screen (pixel edition)
// ============================================================

function TaskChip({ label }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="pf" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '92%',
        padding: '5px 12px', background: 'var(--panel)',
      }}>
        <span style={{ color: 'var(--brass)', fontSize: 12 }}>❦</span>
        <span className="font-ui" style={{ fontSize: 14, color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      </div>
    </div>
  );
}

function TimerHero({ scene, robot }) {
  return (
    <div style={{ position: 'relative', height: 300 }}>
      <div className="pf-inset" style={{ position: 'absolute', top: 0, left: 6, right: 6, bottom: 8, overflow: 'hidden', padding: 0 }}>
        <window.PixelScene res={[208, 176]} state={scene} />
      </div>
      <div style={{ position: 'absolute', left: '50%', bottom: 44, transform: 'translateX(-50%)', width: 168, height: 224 }}>
        <window.PixelRobot res={[72, 96]} state={robot} />
      </div>
    </div>
  );
}

function TimerScreen({
  theme = 'night', timeofday = 'night', weather = 'clear',
  robotState = 'focus', costumes = [], mmss = '25:00',
  mode = 'focus', done = 2, total = 4, task = 'Cicero · De Officiis, II',
  active = 'timer', onNav,
}) {
  const scene = { theme, timeofday, weather, fireplace: true, drape: true };
  const robot = { theme, state: robotState, costumes, mmss };
  return (
    <window.Phone theme={theme}>
      <window.StatusBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 16px 0', gap: 11, overflow: 'hidden' }}>
        <TaskChip label={task} />
        <TimerHero scene={scene} robot={robot} />

        {/* caption + cycle */}
        <div style={{ textAlign: 'center', marginTop: -6 }}>
          <div className="font-label" style={{ fontSize: 10, color: 'var(--brass-2)', marginBottom: 8 }}>
            ✦&nbsp; {mode === 'focus' ? 'Focus Session' : mode === 'short' ? 'Short Rest' : 'Long Rest'} &nbsp;✦
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <window.SealDots total={total} done={done} />
          </div>
        </div>

        <window.ModeSeg active={mode} />
        <window.Preset active={25} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 2 }}>
          <window.Ctrl kind="ghost" icon="↺" label="Reset" />
          <window.Ctrl kind="primary" icon="▶" label="Start" />
          <window.Ctrl kind="ghost" icon="⏭" label="Skip" />
        </div>
      </div>
      <window.TabBar active={active} onNav={onNav} />
    </window.Phone>
  );
}

Object.assign(window, { TimerScreen, TimerHero, TaskChip });
