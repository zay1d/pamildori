// ============================================================
// PlaylistScreen.tsx — плеер плейлиста + эмбиент-звуки (pixel edition).
// Транспорт (play/pause/next/prev/shuffle/repeat/volume/прогресс),
// список треков (с бэкенда через usePlaylist; вне Telegram — демо-мок),
// удаление трека, подсказка про загрузку через бота, и блок эмбиент-звуков.
// Эмбиент-звуки играют параллельно с плейлистом (см. useAmbient).
// ============================================================
import type { CSSProperties } from 'react'
import type { PlaylistApi } from '../hooks/usePlaylist'
import type { AmbientApi } from '../hooks/useAmbient'
import { AMBIENTS } from '../ambient'

function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function RoundBtn({
  icon,
  onClick,
  primary,
  active,
  label,
  size = 44,
}: {
  icon: string
  onClick: () => void
  primary?: boolean
  active?: boolean
  label: string
  size?: number
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={primary ? 'pf-brass' : active ? 'pf-raised' : 'pf'}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Jersey 25', monospace",
        fontSize: primary ? 15 : 11,
        color: primary ? '#221603' : active ? 'var(--brass-2)' : 'var(--ink-soft)',
        flex: '0 0 auto',
      }}
    >
      {icon}
    </button>
  )
}

function VolumeSlider({ value, onChange }: { value: number; onChange: (v: number) => void }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>🔈</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label="Volume"
        style={{ flex: 1, accentColor: 'var(--brass)', height: 18 }}
      />
    </div>
  )
}

// ---- ambient sounds ----
function AmbientRow({ icon, label, on, vol, onToggle, onVol }: { icon: string; label: string; on: boolean; vol: number; onToggle: () => void; onVol: (v: number) => void }): JSX.Element {
  return (
    <div className="pf" style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <button
        onClick={onToggle}
        className={on ? 'pf-brass' : 'pf-inset'}
        aria-pressed={on}
        style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flex: '0 0 auto' }}
      >
        {icon}
      </button>
      <span className="font-ui" style={{ fontSize: 14, color: on ? 'var(--ink)' : 'var(--ink-faint)', width: 92, flex: '0 0 auto' }}>
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(vol * 100)}
        onChange={(e) => onVol(Number(e.target.value) / 100)}
        aria-label={`${label} volume`}
        style={{ flex: 1, accentColor: 'var(--brass)', height: 18, opacity: on ? 1 : 0.6 }}
      />
    </div>
  )
}

export function PlaylistScreen({ player, ambient }: { player: PlaylistApi; ambient: AmbientApi }): JSX.Element {
  const cur = player.current
  const dur = cur?.duration ?? 0
  const repeatIcon = player.repeat === 'one' ? '🔂' : '🔁'

  const rowBase: CSSProperties = { padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10 }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 16px 0', gap: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="font-disp" style={{ fontSize: 14, color: 'var(--brass-2)' }}>
          Music
        </span>
        <span className="font-label" style={{ fontSize: 9, color: player.error ? 'var(--brass-2)' : 'var(--ink-faint)' }}>
          {player.loading ? 'loading…' : player.error ? player.error : `${player.tracks.length} tracks`}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14 }}>
        {/* now playing */}
        <div className="pf-raised" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 44,
                height: 44,
                flex: '0 0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--panel)',
                color: 'var(--brass-2)',
                fontSize: 20,
              }}
            >
              ♪
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="font-ui" style={{ fontSize: 16, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cur ? cur.title : 'Nothing playing'}
              </div>
              <div className="font-label" style={{ fontSize: 9, color: 'var(--ink-faint)' }}>
                {cur ? cur.artist : '—'}
              </div>
            </div>
          </div>

          {/* progress (seekable) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <input
              type="range"
              min={0}
              max={Math.max(1, Math.round(dur))}
              value={Math.round(player.progress)}
              onChange={(e) => player.seek(Number(e.target.value))}
              aria-label="Seek"
              style={{ width: '100%', accentColor: 'var(--brass)', height: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="font-num" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {mmss(player.progress)}
              </span>
              <span className="font-num" style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                {mmss(dur)}
              </span>
            </div>
          </div>

          {/* transport */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <RoundBtn icon="⤨" label="Shuffle" active={player.shuffle} onClick={player.toggleShuffle} size={38} />
            <RoundBtn icon="⏮" label="Previous" onClick={player.prev} />
            <RoundBtn icon={player.playing ? '❚❚' : '▶'} label={player.playing ? 'Pause' : 'Play'} primary onClick={player.toggle} size={52} />
            <RoundBtn icon="⏭" label="Next" onClick={player.next} />
            <RoundBtn icon={repeatIcon} label={`Repeat: ${player.repeat}`} active={player.repeat !== 'off'} onClick={player.cycleRepeat} size={38} />
          </div>

          <VolumeSlider value={player.volume} onChange={player.setVolume} />
        </div>

        {/* track list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {player.tracks.map((t, i) => {
            const on = i === player.index
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'stretch', gap: 4 }}>
                <button
                  onClick={() => player.select(i)}
                  className={on ? 'pf-raised' : 'pf'}
                  style={{ ...rowBase, flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer' }}
                >
                  <span style={{ width: 18, flex: '0 0 auto', color: on ? 'var(--brass-2)' : 'var(--ink-faint)', fontSize: 12 }}>
                    {on && player.playing ? '▶' : i + 1}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="font-ui" style={{ fontSize: 14, color: on ? 'var(--brass-2)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.title}
                    </div>
                    <div className="font-label" style={{ fontSize: 8, color: 'var(--ink-faint)' }}>
                      {t.artist}
                    </div>
                  </div>
                  <span className="font-num" style={{ fontSize: 13, color: 'var(--ink-faint)', flex: '0 0 auto' }}>
                    {mmss(t.duration)}
                  </span>
                </button>
                {player.source === 'api' && (
                  <button
                    onClick={() => player.remove(t.id)}
                    className="pf"
                    aria-label={`Delete ${t.title}`}
                    title="Delete"
                    style={{ width: 34, flex: '0 0 auto', color: 'var(--ink-faint)', fontSize: 13, cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
          {player.source === 'api' && !player.loading && player.tracks.length === 0 && (
            <div className="font-label" style={{ fontSize: 9, color: 'var(--ink-faint)', textAlign: 'center', padding: '6px 0' }}>
              Your playlist is empty
            </div>
          )}
        </div>

        {/* add via bot hint */}
        <div className="pf-inset" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>✈️</span>
          <span className="font-ui" style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
            To add a track — send an audio file to the Pamildori bot in Telegram.
          </span>
        </div>

        {/* ambient sounds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="font-label" style={{ fontSize: 9, color: 'var(--brass-2)', margin: '4px 2px 0' }}>
            Ambient sounds <span style={{ color: 'var(--ink-faint)' }}>· play over your music</span>
          </div>
          {AMBIENTS.map((a) => {
            const st = ambient.states[a.id] ?? { on: false, vol: 0.5 }
            return (
              <AmbientRow
                key={a.id}
                icon={a.icon}
                label={a.label}
                on={st.on}
                vol={st.vol}
                onToggle={() => ambient.toggle(a.id)}
                onVol={(v) => ambient.setVol(a.id, v)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
