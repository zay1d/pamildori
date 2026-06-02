// ============================================================
// window-scene.jsx — procedural "scene behind the window"
//   <WindowScene timeofday="day" weather="clear" arched />
//   timeofday: night | twilight | dawn | day | dusk
//   weather:   clear | cloudy | rain | storm
// Layers are independent (data-timeofday / data-weather) so the
// front-end can mix any sky with any weather. NOT 20 static images.
//   L1 sky gradient · L2 celestial+stars · L3 distant landscape
//   L4 clouds · L5 rain · L6 lightning · L7 weather-darken · glass
// ============================================================

function WindowScene({ timeofday = 'day', weather = 'clear', arched = true, className = '', style = {} }) {
  const isNightish = timeofday === 'night' || timeofday === 'twilight';
  const showSun = timeofday === 'day' || timeofday === 'dawn' || timeofday === 'dusk';
  const showClouds = weather !== 'clear';
  const showRain = weather === 'rain' || weather === 'storm';
  const showStorm = weather === 'storm';

  const darkenByWeather = { clear: 0, cloudy: 0.14, rain: 0.30, storm: 0.46 }[weather];

  const stars = React.useMemo(
    () => Array.from({ length: 26 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 62,
      s: 0.6 + Math.random() * 1.6,
      d: Math.random() * 3,
    })), []
  );
  const drops = React.useMemo(
    () => Array.from({ length: 34 }, () => ({
      left: Math.random() * 108 - 4,
      delay: Math.random() * 1.1,
      dur: 0.5 + Math.random() * 0.4,
      len: 9 + Math.random() * 9,
    })), []
  );

  const frameR = arched ? '50% 50% 14px 14px / 38% 38% 14px 14px' : '16px';

  return (
    <div
      className={`pm-window ${className}`}
      data-timeofday={timeofday}
      data-weather={weather}
      style={{
        position: 'relative',
        background: 'linear-gradient(150deg, var(--robot-body-2), var(--robot-body))',
        padding: 12,
        borderRadius: frameR,
        boxShadow: '0 18px 40px var(--shadow), inset 0 0 0 1px rgba(0,0,0,0.25)',
        ...style,
      }}
    >
      {/* GLASS / SCENE */}
      <div style={{
        position: 'absolute', inset: 12,
        borderRadius: arched ? '46% 46% 8px 8px / 34% 34% 8px 8px' : '8px',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 3px var(--brass), inset 0 0 24px rgba(0,0,0,0.5)',
      }}>
        {/* L1 — SKY */}
        <div className={`sky sky-${timeofday}`} style={{ position: 'absolute', inset: 0 }} />

        {/* L2 — CELESTIAL + STARS */}
        {showSun ? (
          <div style={{
            position: 'absolute', left: '22%', top: '20%', width: 54, height: 54, borderRadius: '50%',
            background: timeofday === 'day'
              ? 'radial-gradient(circle, #fff7df 0%, #f3dd9b 55%, rgba(243,221,155,0) 72%)'
              : 'radial-gradient(circle, #ffe9c0 0%, #e8a85e 55%, rgba(232,168,94,0) 75%)',
            filter: 'blur(0.3px)',
          }} />
        ) : (
          <div style={{
            position: 'absolute', right: '22%', top: '16%', width: 40, height: 40, borderRadius: '50%',
            background: 'radial-gradient(circle at 38% 38%, #f3ecd6 0%, #cfc6ad 70%, #b3aa90 100%)',
            boxShadow: '0 0 22px rgba(243,236,214,0.45)',
          }}>
            <div style={{ position: 'absolute', left: 9, top: 12, width: 7, height: 7, borderRadius: '50%', background: 'rgba(120,110,86,0.35)' }} />
            <div style={{ position: 'absolute', left: 22, top: 22, width: 5, height: 5, borderRadius: '50%', background: 'rgba(120,110,86,0.3)' }} />
            <div style={{ position: 'absolute', left: 16, top: 6, width: 4, height: 4, borderRadius: '50%', background: 'rgba(120,110,86,0.28)' }} />
          </div>
        )}
        {isNightish && stars.map((st, i) => (
          <div key={i} className="pm-star" style={{
            position: 'absolute', left: `${st.left}%`, top: `${st.top}%`,
            width: st.s, height: st.s, borderRadius: '50%', background: '#f3ecd6',
            animation: `pm-star-twinkle ${2 + st.d}s ease-in-out ${st.d}s infinite`,
          }} />
        ))}

        {/* L3 — DISTANT LANDSCAPE (Roman/Italianate silhouette) */}
        <svg viewBox="0 0 200 80" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: '46%' }}>
          <path d="M0 60 Q40 40 78 52 Q120 66 160 44 Q185 34 200 46 L200 80 L0 80 Z"
                fill="rgba(0,0,0,0.32)" />
          {/* two cypress trees */}
          <path d="M44 60 Q49 30 50 28 Q51 30 56 60 Z" fill="rgba(0,0,0,0.42)" />
          <path d="M150 52 Q155 24 156 22 Q157 24 162 52 Z" fill="rgba(0,0,0,0.42)" />
          {/* a distant dome */}
          <path d="M96 56 Q100 40 108 40 Q116 40 120 56 Z" fill="rgba(0,0,0,0.38)" />
          <rect x="104" y="33" width="8" height="8" rx="4" fill="rgba(0,0,0,0.38)" />
        </svg>

        {/* L4 — CLOUDS */}
        {showClouds && [0, 1, 2].map((i) => (
          <div key={i} className="pm-cloud" style={{
            position: 'absolute',
            left: `${8 + i * 30}%`, top: `${14 + i * 12}%`,
            width: 70 - i * 8, height: 22 - i * 2, borderRadius: 999,
            background: showStorm ? 'rgba(58,58,66,0.92)' : 'rgba(150,144,128,0.8)',
            filter: 'blur(2px)',
            boxShadow: '18px 4px 0 -4px currentColor, -16px 5px 0 -3px currentColor',
            color: showStorm ? 'rgba(58,58,66,0.92)' : 'rgba(150,144,128,0.8)',
            animation: `pm-cloud-drift ${10 + i * 4}s ease-in-out ${i}s infinite alternate`,
          }} />
        ))}

        {/* L5 — RAIN */}
        {showRain && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {drops.map((d, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${d.left}%`, top: 0, width: 1.4, height: d.len,
                background: 'linear-gradient(rgba(200,210,225,0), rgba(200,210,225,0.6))',
                transform: 'rotate(12deg)',
                animation: `pm-rain ${d.dur}s linear ${d.delay}s infinite`,
              }} />
            ))}
          </div>
        )}

        {/* L6 — LIGHTNING */}
        {showStorm && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(245,238,210,0.9)',
            animation: 'pm-lightning 6s linear infinite', mixBlendMode: 'screen',
          }} />
        )}

        {/* L7 — WEATHER DARKEN */}
        {darkenByWeather > 0 && (
          <div style={{ position: 'absolute', inset: 0, background: `rgba(20,22,30,${darkenByWeather})` }} />
        )}

        {/* glass glare */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(125deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.05) 100%)',
        }} />
      </div>

      {/* MUNTINS (window cross-bars) over the glass */}
      <div style={{ position: 'absolute', left: '50%', top: 12, bottom: 12, width: 7, marginLeft: -3.5,
        background: 'linear-gradient(var(--brass-2), var(--brass))', borderRadius: 4, opacity: 0.92 }} />
      <div style={{ position: 'absolute', top: '54%', left: 12, right: 12, height: 7, marginTop: -3.5,
        background: 'linear-gradient(var(--brass-2), var(--brass))', borderRadius: 4, opacity: 0.92 }} />
    </div>
  );
}

window.WindowScene = WindowScene;
