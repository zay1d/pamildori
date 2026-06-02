import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { applyTelegramTheme, initTelegram } from './telegram'
import './styles/pixel.css'

// Готовим Mini App и применяем тему Telegram (если запущены внутри клиента).
initTelegram()
applyTelegramTheme()

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
}
