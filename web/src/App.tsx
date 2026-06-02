// ============================================================
// App.tsx — оболочка приложения: рамка телефона + активный экран
// + нижний TabBar. Состояние вкладок — обычный React-стейт.
// ============================================================
import { useState } from 'react'
import { Phone, StatusBar, TabBar } from './components/ui/pixelUi'
import type { TabId } from './components/ui/pixelUi'
import { TimerScreen } from './screens/TimerScreen'
import { TasksScreen } from './screens/TasksScreen'
import { Placeholder } from './screens/Placeholder'
import { useSettings } from './hooks/useSettings'
import { useTasks } from './hooks/useTasks'
import { useTheme } from './hooks/useTheme'

export default function App(): JSX.Element {
  const [settings] = useSettings()
  const tasks = useTasks()
  const [tab, setTab] = useState<TabId>('timer')
  const { theme } = useTheme(settings)

  // Завершённая фокус-сессия засчитывает помодоро активной задаче.
  const handleFocusComplete = (): void => {
    tasks.incrementActiveDone()
  }

  return (
    <Phone theme={theme}>
      <StatusBar />
      {tab === 'timer' && (
        <TimerScreen settings={settings} activeTask={tasks.active} onFocusComplete={handleFocusComplete} />
      )}
      {tab === 'tasks' && <TasksScreen tasks={tasks} />}
      {tab === 'stats' && <Placeholder title="Stats" />}
      {tab === 'playlist' && <Placeholder title="Music" />}
      {tab === 'settings' && <Placeholder title="Settings" />}
      <TabBar active={tab} onNav={setTab} />
    </Phone>
  )
}
