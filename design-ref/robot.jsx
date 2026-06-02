// ============================================================
// robot.jsx — Pamildori robot-timer character
// Layered & parametric so the front-end can stack costumes:
//   <Robot size={180} state="idle" costumes={['nightcap','headphones']} />
//   state:    idle | focus | break | complete | dozing
//   costumes: array of 'nightcap' | 'headphones'
// Walnut + brass "screen-faced" robot (direction #2). Costumes are
// independent <g> layers drawn over the base so night + playlist =
// nightcap AND headphones simultaneously.
// ============================================================

function Robot({ size = 180, state = 'idle', costumes = [], className = '', style = {} }) {
  const uid = React.useId().replace(/:/g, '');
  const hasCap = costumes.includes('nightcap');
  const hasCans = costumes.includes('headphones');
  const breathing = state === 'idle' || state === 'break';

  // ---------- FACE (expression by state) ----------
  const eye = (cx) => (
    <g>
      <circle cx={cx} cy="99" r="11" fill="var(--robot-glow)" />
      <circle cx={cx} cy="99" r="6.5" fill="var(--robot-eye)" />
      <circle cx={cx - 2} cy="96.5" r="1.8" fill="#fff" opacity="0.85" />
    </g>
  );

  let face;
  if (state === 'focus') {
    face = (
      <g>
        <ellipse cx="83" cy="99" rx="5.5" ry="4.4" fill="var(--robot-eye)" />
        <ellipse cx="117" cy="99" rx="5.5" ry="4.4" fill="var(--robot-eye)" />
        <line x1="90" y1="120" x2="110" y2="120" stroke="var(--brass)" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  } else if (state === 'break') {
    face = (
      <g>
        <path d="M76 100 Q83 94 90 100" fill="none" stroke="var(--robot-eye)" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M110 100 Q117 94 124 100" fill="none" stroke="var(--robot-eye)" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M86 116 Q100 126 114 116" fill="none" stroke="var(--brass)" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  } else if (state === 'complete') {
    face = (
      <g>
        <path d="M75 103 L83 94 L91 103" fill="none" stroke="var(--robot-eye)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M109 103 L117 94 L125 103" fill="none" stroke="var(--robot-eye)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M84 114 Q100 132 116 114" fill="none" stroke="var(--brass-2)" strokeWidth="3.2" strokeLinecap="round" />
      </g>
    );
  } else if (state === 'dozing') {
    face = (
      <g>
        <path d="M76 100 Q83 104 90 100" fill="none" stroke="var(--robot-eye)" strokeWidth="3.2" strokeLinecap="round" opacity="0.8" />
        <path d="M110 100 Q117 104 124 100" fill="none" stroke="var(--robot-eye)" strokeWidth="3.2" strokeLinecap="round" opacity="0.8" />
        <ellipse cx="100" cy="119" rx="4" ry="3" fill="none" stroke="var(--brass)" strokeWidth="2" />
      </g>
    );
  } else {
    // idle
    face = (
      <g className="pm-eyes" style={{ transformOrigin: 'center 99px', transformBox: 'fill-box' }}>
        {eye(83)}
        {eye(117)}
        <path d="M88 118 Q100 125 112 118" fill="none" stroke="var(--brass)" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      style={{ overflow: 'visible', ...style }}
      role="img"
      aria-label={`Pamildori robot, ${state}`}
    >
      <defs>
        <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--robot-body-2)" />
          <stop offset="1" stopColor="var(--robot-body)" />
        </linearGradient>
        <radialGradient id={`screen-${uid}`} cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stopColor="var(--robot-screen-2)" />
          <stop offset="1" stopColor="var(--robot-screen)" />
        </radialGradient>
        <linearGradient id={`brass-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--brass-2)" />
          <stop offset="1" stopColor="var(--brass)" />
        </linearGradient>
      </defs>

      {/* whole-body breathing wrap */}
      <g className={breathing ? 'pm-breathe' : ''} style={{ transformOrigin: 'center 160px', transformBox: 'fill-box' }}>

        {/* shadow */}
        <ellipse cx="100" cy="190" rx="52" ry="9" fill="rgba(0,0,0,0.28)" />

        {/* feet */}
        <rect x="68" y="170" width="24" height="16" rx="7" fill={`url(#brass-${uid})`} />
        <rect x="108" y="170" width="24" height="16" rx="7" fill={`url(#brass-${uid})`} />

        {/* arms */}
        <rect x="33" y="118" width="15" height="38" rx="7.5" fill={`url(#brass-${uid})`} />
        <rect x="152" y="118" width="15" height="38" rx="7.5" fill={`url(#brass-${uid})`} />
        <circle cx="40.5" cy="118" r="6" fill="var(--robot-body-2)" stroke="var(--brass)" strokeWidth="2" />
        <circle cx="159.5" cy="118" r="6" fill="var(--robot-body-2)" stroke="var(--brass)" strokeWidth="2" />

        {/* antenna (hidden under nightcap) */}
        {!hasCap && (
          <g>
            <line x1="100" y1="56" x2="100" y2="40" stroke="var(--brass)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="35" r="6" fill="var(--burgundy)" stroke="var(--burgundy-2)" strokeWidth="1.5" />
          </g>
        )}

        {/* body */}
        <rect x="42" y="54" width="116" height="120" rx="30" fill={`url(#body-${uid})`} stroke={`url(#brass-${uid})`} strokeWidth="4" />
        <rect x="49" y="61" width="102" height="106" rx="24" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
        {/* corner rivets */}
        <circle cx="60" cy="72" r="3" fill="var(--brass)" />
        <circle cx="140" cy="72" r="3" fill="var(--brass)" />
        <circle cx="60" cy="156" r="3" fill="var(--brass)" />
        <circle cx="140" cy="156" r="3" fill="var(--brass)" />

        {/* face screen */}
        <rect x="60" y="74" width="80" height="58" rx="16" fill={`url(#screen-${uid})`} stroke="var(--brass)" strokeWidth="2" />
        <rect x="63" y="77" width="74" height="22" rx="11" fill="rgba(255,255,255,0.04)" />
        {face}

        {/* engraved chest nameplate / wax seal */}
        <circle cx="100" cy="150" r="9" fill="var(--burgundy)" stroke="var(--brass)" strokeWidth="1.5" />
        <text x="100" y="153.5" textAnchor="middle" fontFamily="'Playfair Display', serif" fontSize="9" fontWeight="700" fill="var(--brass-2)">P</text>

        {/* ---------- COSTUME: HEADPHONES ---------- */}
        {hasCans && (
          <g>
            <path d="M40 100 Q40 46 100 44 Q160 46 160 100" fill="none" stroke={`url(#brass-${uid})`} strokeWidth="8" strokeLinecap="round" />
            <rect x="28" y="90" width="22" height="36" rx="10" fill="var(--robot-body)" stroke="var(--brass)" strokeWidth="2.5" />
            <rect x="150" y="90" width="22" height="36" rx="10" fill="var(--robot-body)" stroke="var(--brass)" strokeWidth="2.5" />
            <rect x="33" y="96" width="12" height="24" rx="6" fill="var(--burgundy)" />
            <rect x="155" y="96" width="12" height="24" rx="6" fill="var(--burgundy)" />
          </g>
        )}

        {/* ---------- COSTUME: NIGHTCAP ---------- */}
        {hasCap && (
          <g style={{ transformOrigin: '150px 22px', transformBox: 'fill-box' }} className="pm-sway-soft">
            {/* knit cone, flops to the right */}
            <path d="M52 58 Q48 30 96 24 Q150 18 156 38 Q150 50 128 50 Q140 40 108 40 Q72 42 66 58 Z"
                  fill="var(--olive)" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" />
            {/* folded ribbed brim */}
            <rect x="48" y="50" width="108" height="15" rx="7.5" fill="var(--burgundy)" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
            <line x1="64" y1="52" x2="64" y2="63" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
            <line x1="80" y1="52" x2="80" y2="63" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
            <line x1="100" y1="52" x2="100" y2="63" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
            <line x1="120" y1="52" x2="120" y2="63" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
            <line x1="136" y1="52" x2="136" y2="63" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" />
            {/* pompom */}
            <circle cx="158" cy="36" r="8" fill="var(--brass-2)" stroke="var(--brass)" strokeWidth="1.5" />
          </g>
        )}
      </g>

      {/* ---------- STATE FX (outside breathing wrap) ---------- */}
      {state === 'complete' && (
        <g>
          <path className="pm-spk" style={{ animationDelay: '0s' }}  d="M48 60 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 z" fill="var(--brass-2)" />
          <path className="pm-spk" style={{ animationDelay: '0.5s' }} d="M156 70 l1.6 5 5 1.6 -5 1.6 -1.6 5 -1.6 -5 -5 -1.6 5 -1.6 z" fill="var(--brass-2)" />
          <path className="pm-spk" style={{ animationDelay: '0.9s' }} d="M150 130 l1.4 4 4 1.4 -4 1.4 -1.4 4 -1.4 -4 -4 -1.4 4 -1.4 z" fill="var(--brass-2)" />
        </g>
      )}
      {state === 'dozing' && (
        <g fontFamily="'Playfair Display', serif" fill="var(--ink-soft)" fontWeight="600">
          <text className="pm-z" style={{ animationDelay: '0s' }}   x="138" y="60" fontSize="13">z</text>
          <text className="pm-z" style={{ animationDelay: '0.8s' }} x="146" y="50" fontSize="16">Z</text>
          <text className="pm-z" style={{ animationDelay: '1.6s' }} x="156" y="40" fontSize="20">Z</text>
        </g>
      )}
    </svg>
  );
}

window.Robot = Robot;
