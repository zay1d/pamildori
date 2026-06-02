// ============================================================
// icons.jsx — dark-academia line icons (stroke = currentColor)
// ============================================================
function _svg(children, { size = 24, sw = 1.6, fill = 'none', vb = 24 } = {}) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill={fill}
         stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const IconHourglass = (p) => _svg(<g>
  <path d="M6 3h12M6 21h12" />
  <path d="M7 3c0 4 3 5.5 5 9 2-3.5 5-5 5-9" />
  <path d="M7 21c0-4 3-5.5 5-9 2 3.5 5 5 5 9" />
</g>, p);

const IconQuill = (p) => _svg(<g>
  <path d="M4 20c6-1 9-4 12-9 2-3.5 3-7 3-7s-9 1-13 6c-2.5 3-2 7-2 10z" />
  <path d="M4 20l6-6" />
  <path d="M11 11l3 3" />
</g>, p);

const IconChart = (p) => _svg(<g>
  <path d="M4 20V4M20 20H4" />
  <rect x="7" y="12" width="2.6" height="5" rx="0.6" />
  <rect x="12" y="8"  width="2.6" height="9" rx="0.6" />
  <rect x="17" y="14" width="2.6" height="3" rx="0.6" />
</g>, p);

const IconDisc = (p) => _svg(<g>
  <circle cx="12" cy="12" r="8.5" />
  <circle cx="12" cy="12" r="2" />
  <path d="M12 3.5a8.5 8.5 0 0 1 0 17" opacity="0.5" />
</g>, p);

const IconGear = (p) => _svg(<g>
  <circle cx="12" cy="12" r="3.2" />
  <path d="M12 2v2.5M12 19.5V22M4.2 7l2.2 1.3M17.6 15.7l2.2 1.3M19.8 7l-2.2 1.3M6.4 15.7L4.2 17M2 12h2.5M19.5 12H22" />
</g>, p);

const IconPlay  = (p) => _svg(<path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none" />, p);
const IconPause = (p) => _svg(<g fill="currentColor" stroke="none"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2" /><rect x="13.9" y="5" width="3.6" height="14" rx="1.2" /></g>, p);
const IconReset = (p) => _svg(<g><path d="M4 5v5h5" /><path d="M5 14a7.5 7.5 0 1 0 1.5-7.5L4 9" /></g>, p);
const IconSkip  = (p) => _svg(<g fill="currentColor" stroke="none"><path d="M5 5l9 7-9 7z" /><rect x="15.5" y="5" width="3" height="14" rx="1" /></g>, p);
const IconPencil = (p) => _svg(<g><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" /><path d="M14 6l3 3" /></g>, p);

const IconPlus  = (p) => _svg(<path d="M12 5v14M5 12h14" />, p);
const IconCheck = (p) => _svg(<path d="M5 12.5l4.5 4.5L19 7" />, p);
const IconPrev  = (p) => _svg(<g fill="currentColor" stroke="none"><path d="M18 5l-9 7 9 7z" /><rect x="6" y="5" width="3" height="14" rx="1" /></g>, p);
const IconNext  = (p) => _svg(<g fill="currentColor" stroke="none"><path d="M6 5l9 7-9 7z" /><rect x="15" y="5" width="3" height="14" rx="1" /></g>, p);
const IconShuffle = (p) => _svg(<g><path d="M4 7h3l9 10h4M4 17h3l3-3M14 9l2-2h4" /><path d="M18 5l2 2-2 2M18 15l2 2-2 2" /></g>, p);
const IconRepeat  = (p) => _svg(<g><path d="M5 9V8a3 3 0 0 1 3-3h8l-2-2m2 2-2 2" /><path d="M19 15v1a3 3 0 0 1-3 3H8l2 2m-2-2 2-2" /></g>, p);
const IconVolume  = (p) => _svg(<g><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16 9a3.5 3.5 0 0 1 0 6" /></g>, p);
const IconFlame   = (p) => _svg(<path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1-3 .3 1 1 1.5 1.5 1.5C9.8 7 12 6 12 3z" />, p);
const IconRain    = (p) => _svg(<g><path d="M7 14a4 4 0 0 1-.5-8 5 5 0 0 1 9.5-1 3.5 3.5 0 0 1 1 7" /><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" /></g>, p);
const IconFire    = IconFlame;
const IconCup     = (p) => _svg(<g><path d="M5 8h11v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8z" /><path d="M16 9h2.5a2 2 0 0 1 0 4H16" /><path d="M7 3v2M10 3v2M13 3v2" /></g>, p);
const IconWaves   = (p) => _svg(<g><path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></g>, p);
const IconBell    = (p) => _svg(<g><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2z" /><path d="M10 20a2 2 0 0 0 4 0" /></g>, p);
const IconClock   = (p) => _svg(<g><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3 2" /></g>, p);
const IconTarget  = (p) => _svg(<g><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></g>, p);
const IconMoon    = (p) => _svg(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />, p);
const IconSun     = (p) => _svg(<g><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></g>, p);
const IconCloud   = (p) => _svg(<path d="M7 18a4 4 0 0 1-.5-8 5 5 0 0 1 9.5-1 3.5 3.5 0 0 1 1 7H7z" />, p);
const IconBolt    = (p) => _svg(<path d="M13 3l-7 9h5l-1 9 7-10h-5l1-8z" fill="currentColor" stroke="none" />, p);
const IconTrash   = (p) => _svg(<g><path d="M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13" /></g>, p);
const IconAudio   = (p) => _svg(<g><path d="M9 18V6l10-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /></g>, p);

Object.assign(window, {
  IconHourglass, IconQuill, IconChart, IconDisc, IconGear,
  IconPlay, IconPause, IconReset, IconSkip, IconPencil, IconPlus, IconCheck,
  IconPrev, IconNext, IconShuffle, IconRepeat, IconVolume,
  IconFlame, IconRain, IconFire, IconCup, IconWaves, IconBell,
  IconClock, IconTarget, IconMoon, IconSun, IconCloud, IconBolt, IconTrash, IconAudio,
});
