// ============================================================
// ErrorBoundary — ловит рантайм-ошибки рендера/эффектов и показывает
// их на экране вместо «белого экрана» (React 18 иначе размонтирует весь
// корень при необработанном исключении). Помогает быстро увидеть причину.
// ============================================================
import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: unknown): void {
    // eslint-disable-next-line no-console
    console.error('Pamildori crashed:', error, info)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div
        style={{
          minHeight: '100vh',
          padding: 20,
          background: '#15121b',
          color: '#ecdfc6',
          fontFamily: "'DotGothic16', monospace",
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ fontSize: 18, color: '#e6c574' }}>Something broke ✦</div>
        <div style={{ fontSize: 13, color: '#b9a988' }}>{error.message}</div>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: 11,
            color: '#8a7a5e',
            background: '#1c1824',
            padding: 12,
            border: '2px solid #4c3d58',
            overflow: 'auto',
            maxHeight: '60vh',
          }}
        >
          {error.stack || String(error)}
        </pre>
        <button
          onClick={() => location.reload()}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 16px',
            background: '#c8a24a',
            color: '#221603',
            border: '2px solid #8a6a2a',
            fontFamily: "'DotGothic16', monospace",
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    )
  }
}
