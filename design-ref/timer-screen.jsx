// ============================================================
// timer-screen.jsx — the main Timer screen composition
//   <TimerScreen theme timeofday weather robotState costumes
//                time mode done total task />
// Window (big & cinematic) with the robot seated on the sill in front.
// ============================================================

function WindowHero({ timeofday, weather, robotState, costumes }) {
  return (
    <div style={{ position: 'relative', height: 232 }}>
      <window.WindowScene
        timeofday={timeofday} weather={weather} arched
        style={{ position: 'absolute', left: 14, right: 14, top: 0, height: 196 }}
      />
      {/* windowsill / wooden ledge */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 30, height: 22,
        background: 'linear-gradient(var(--robot-body-2), var(--robot-body))',
        borderRadius: 7, boxShadow: '0 8px 18px var(--shadow), inset 0 1px 0 rgba(255,255,255,0.08)',
        borderTop: '1px solid var(--brass)',
      }} />
      {/* candle (left) */}
      <div style={{ position: 'absolute', left: 34, bottom: 52, width: 18, textAlign: 'center' }}>
        <div className="pm-flame" style={{
          width: 7, height: 13, margin: '0 auto', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
          background: 'radial-gradient(circle at 50% 70%, #fff1c0, #f0a83c 60%, rgba(240,168,60,0))',
          transformOrigin: 'bottom center', animation: 'pm-candle 1.8s ease-in-out infinite',
        }} />
        <div style={{ width: 12, height: 22, margin: '0 auto', borderRadius: 3, background: 'linear-gradient(var(--panel-hi), var(--panel-2))', boxShadow: 'inset -2px 0 3px rgba(0,0,0,0.25)' }} />
      </div>
      {/* small book stack (right) */}
      <div style={{ position: 'absolute', right: 30, bottom: 52, display: 'flex', flexDirection: 'column', gap: 2, transform: 'rotate(-3deg)' }}>
        <div style={{ width: 40, height: 8, borderRadius: 2, background: 'var(--burgundy)', boxShadow: 'inset 0 -2px 2px rgba(0,0,0,0.3)' }} />
        <div style={{ width: 44, height: 8, borderRadius: 2, background: 'var(--olive)', marginLeft: -2 }} />
        <div style={{ width: 38, height: 8, borderRadius: 2, background: 'var(--brass)' }} />
      </div>
      {/* robot, seated in front of the sill */}
      <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)' }}>
        <window.Robot size={150} state={robotState} costumes={costumes} />
      </div>
    </div>
  );
}

function PresetChips({ active = 25 }) {
  const presets = [5, 15, 30, 60];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
      {presets.map((p) => {
        const on = p === active;
        return (
          <div key={p} style={{
            flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 11,
            border: `1px solid ${on ? 'var(--brass)' : 'var(--line)'}`,
            background: on ? 'rgba(199,154,63,0.12)' : 'var(--panel)',
            color: on ? 'var(--brass-2)' : 'var(--ink-soft)',
            fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600,
          }}>{p}<span style={{ fontSize: 10, opacity: 0.7 }}>′</span></div>
        );
      })}
      <div style={{
        width: 42, display: 'grid', placeItems: 'center', borderRadius: 11,
        border: '1px dashed var(--line-2)', color: 'var(--ink-faint)', background: 'var(--panel)',
      }}>
        <window.IconPencil size={17} />
      </div>
    </div>
  );
}

function CtrlBtn({ kind = 'ghost', children, label }) {
  const primary = kind === 'primary';
  return (
    <button style={{
      cursor: 'pointer', border: 'none', borderRadius: 16,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
      padding: primary ? '0' : '0',
      width: primary ? 96 : 60, height: primary ? 64 : 60,
      background: primary ? 'linear-gradient(var(--brass-2), var(--brass))' : 'var(--panel)',
      border: primary ? 'none' : '1px solid var(--line)',
      color: primary ? '#241a0c' : 'var(--ink-soft)',
      boxShadow: primary ? '0 8px 22px rgba(199,154,63,0.3), inset 0 1px 0 rgba(255,255,255,0.3)' : '0 2px 6px var(--shadow-soft)',
    }}>
      {children}
      <span style={{ fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: primary ? 700 : 500 }}>{label}</span>
    </button>
  );
}

function TimerScreen({
  theme = 'night', timeofday = 'night', weather = 'cloudy',
  robotState = 'idle', costumes = ['nightcap'],
  time = '25:00', mode = 'focus', done = 2, total = 4,
  task = 'Reading — Cicero, De Officiis',
}) {
  return (
    <window.Phone theme={theme}>
      <window.StatusBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '6px 18px 0', gap: 12, overflow: 'hidden' }}>

        {/* active task chip */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '100%',
            padding: '6px 14px', borderRadius: 999, background: 'var(--panel)',
            border: '1px solid var(--line)', color: 'var(--ink-soft)',
          }}>
            <span style={{ color: 'var(--brass)' }}><window.IconQuill size={15} /></span>
            <span style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task}</span>
          </div>
        </div>

        {/* window + robot */}
        <WindowHero timeofday={timeofday} weather={weather} robotState={robotState} costumes={costumes} />

        {/* timer display */}
        <div style={{ textAlign: 'center', marginTop: -4 }}>
          <div className="label" style={{ color: 'var(--brass)', marginBottom: 2 }}>
            {mode === 'focus' ? 'Focus Session' : mode === 'short' ? 'Short Rest' : 'Long Rest'}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 68, lineHeight: 0.95, color: 'var(--ink)', letterSpacing: '0.01em' }}>
            {time}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <window.SealDots total={total} done={done} />
          </div>
        </div>

        {/* mode + presets */}
        <window.ModeSeg active={mode} />
        <PresetChips active={25} />

        {/* controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 2 }}>
          <CtrlBtn kind="ghost" label="Reset"><window.IconReset size={22} /></CtrlBtn>
          <CtrlBtn kind="primary" label="Start"><window.IconPlay size={26} /></CtrlBtn>
          <CtrlBtn kind="ghost" label="Skip"><window.IconSkip size={22} /></CtrlBtn>
        </div>
      </div>
      <window.TabBar active="timer" />
    </window.Phone>
  );
}

window.TimerScreen = TimerScreen;
window.WindowHero = WindowHero;
