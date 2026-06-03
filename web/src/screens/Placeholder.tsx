// Простая заглушка для вкладок, которые реализуются в следующих юнитах.
export function Placeholder({ title }: { title: string }): JSX.Element {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '8px 16px',
        textAlign: 'center',
      }}
    >
      <div className="font-disp" style={{ fontSize: 16, color: 'var(--brass-2)' }}>
        {title}
      </div>
      <div className="font-label" style={{ fontSize: 9, color: 'var(--ink-faint)' }}>
        Coming soon
      </div>
    </div>
  )
}
