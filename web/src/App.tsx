// ============================================================
// App.tsx — оболочка приложения: рамка телефона + активный экран
// + нижний TabBar. Состояние вкладок — обычный React-стейт.
// ============================================================
import { useState } from 'react'
import { Phone, StatusBar, TabBar } from './components/ui/pixelUi'
import type { TabId } from './components/ui/pixelUi'
import { TimerScreen } from './screens/TimerScreen'
import { Placeholder } from './screens/Placeholder'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './hooks/useTheme'

export default function App(): JSX.Element {
  const [settings] = useSettings()
  const [tab, setTab] = useState<TabId>('timer')
  const { theme } = useTheme(settings)

  return (
    <Phone theme={theme}>
      <StatusBar />
      {tab === 'timer' && <TimerScreen settings={settings} />}
      {tab === 'tasks' && <Placeholder title="Tasks" />}
      {tab === 'stats' && <Placeholder title="Stats" />}
      {tab === 'playlist' && <Placeholder title="Music" />}
      {tab === 'settings' && <Placeholder title="Settings" />}
      <TabBar active={tab} onNav={setTab} />
    </Phone>
  )
}
