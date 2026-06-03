// ============================================================
// ui.jsx — shared Pamildori chrome: Phone, StatusBar, TabBar,
// SealDots (wax-seal cycle indicator), ModeSeg, SectionTitle
// ============================================================

function Phone({ theme = 'night', children, style = {}, width = 390, height = 844 }) {
  return (
    <div className={`theme-${theme} grain`} style={{
      width, height, position: 'relative', overflow: 'hidden',
      background: 'var(--bg)', color: 'var(--ink)',
      borderRadius: 44, border: '1px solid var(--line)',
      boxShadow: '0 30px 80px var(--shadow), inset 0 0 0 6px rgba(0,0,0,0.18)',
      fontFamily: "'EB Garamond', Georgia, serif",
      display: 'flex', flexDirection: 'column',
      ...style,
    }}>
      {children}
    </div>
  );
}

function StatusBar({ title = 'Pamildori' }) {
  return (
    <div style={{ position: 'relative', paddingTop: 12, flex: '0 0 auto' }}>
      {/* telegram drag handle */}
      <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--line-2)', margin: '0 auto 8px' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, letterSpacing: '0.04em', color: 'var(--ink)' }}>{title}</span>
        <span className="label" style={{ fontSize: 10, letterSpacing: '0.18em' }}>9:41</span>
      </div>
    </div>
  );
}

function TabBar({ active = 'timer', onNav }) {
  const tabs = [
    ['timer', 'Timer', window.IconHourglass],
    ['tasks', 'Tasks', window.IconQuill],
    ['stats', 'Stats', window.IconChart],
    ['playlist', 'Music', window.IconDisc],
    ['settings', 'Settings', window.IconGear],
  ];
  return (
    <div style={{
      flex: '0 0 auto', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)',
      gap: 2, padding: '10px 10px 24px',
      background: 'linear-gradient(var(--panel), var(--panel-2))',
      borderTop: '1px solid var(--line-2)',
      boxShadow: '0 -8px 24px var(--shadow-soft)',
    }}>
      {tabs.map(([id, label, Icon]) => {
        const on = id === active;
        return (
          <button key={id} onClick={() => onNav && onNav(id)} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            padding: '6px 2px', color: on ? 'var(--brass-2)' : 'var(--ink-faint)',
          }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30 }}>
              <Icon size={on ? 23 : 21} sw={on ? 1.8 : 1.5} />
            </span>
            <span style={{ fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase',
              fontWeight: on ? 700 : 500, opacity: on ? 1 : 0.85 }}>{label}</span>
            {on && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--brass)', marginTop: -1 }} />}
          </button>
        );
      })}
    </div>
  );
}

// wax-seal cycle indicator — filled seal = completed pomodoro
function SealDots({ total = 4, done = 2, size = 18 }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < done;
        return (
          <span key={i} style={{
            width: size, height: size, borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            background: filled ? 'radial-gradient(circle at 38% 32%, var(--burgundy-2), var(--burgundy))' : 'transparent',
            border: filled ? '1px solid var(--burgundy-2)' : '1.5px dashed var(--line-2)',
            boxShadow: filled ? 'inset -1px -1px 2px rgba(0,0,0,0.4), 0 1px 2px var(--shadow-soft)' : 'none',
          }}>
            {filled && <span style={{ fontSize: size * 0.42, color: 'var(--brass-2)', lineHeight: 1 }}>✦</span>}
          </span>
        );
      })}
    </div>
  );
}

function ModeSeg({ active = 'focus', onChange }) {
  const modes = [['focus', 'Focus'], ['short', 'Short Rest'], ['long', 'Long Rest']];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, padding: 4,
      background: 'var(--panel)', borderRadius: 14, border: '1px solid var(--line)',
    }}>
      {modes.map(([id, label]) => {
        const on = id === active;
        return (
          <button key={id} onClick={() => onChange && onChange(id)} style={{
            border: 'none', cursor: 'pointer', borderRadius: 11, padding: '9px 4px',
            fontFamily: "'EB Garamond', serif", fontSize: 13.5, letterSpacing: '0.04em',
            background: on ? 'linear-gradient(var(--brass-2), var(--brass))' : 'transparent',
            color: on ? '#241a0c' : 'var(--ink-soft)', fontWeight: on ? 700 : 500,
            boxShadow: on ? '0 2px 8px var(--shadow-soft)' : 'none',
          }}>{label}</button>
        );
      })}
    </div>
  );
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <h2 style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>{children}</h2>
      {sub && <span className="label">{sub}</span>}
    </div>
  );
}

Object.assign(window, { Phone, StatusBar, TabBar, SealDots, ModeSeg, SectionTitle });
