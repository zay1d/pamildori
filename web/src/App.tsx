// ============================================================
// App.tsx — оболочка приложения: рамка телефона + активный экран
// + нижний TabBar. Состояние вкладок — обычный React-стейт.
// ============================================================
import { useState } from 'react'
import { Phone, StatusBar, TabBar } from './components/ui/pixelUi'
import type { TabId } from './components/ui/pixelUi'
import { TimerScreen } from './screens/TimerScreen'
import { TasksScreen } from './screens/TasksScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { StatsScreen } from './screens/StatsScreen'
import { PlaylistScreen } from './screens/PlaylistScreen'
import { useSettings } from './hooks/useSettings'
import { useTasks } from './hooks/useTasks'
import { useStats } from './hooks/useStats'
import { usePlaylist } from './hooks/usePlaylist'
import { useAmbient } from './hooks/useAmbient'
import { useTheme } from './hooks/useTheme'
import type { Settings } from './types'

export default function App(): JSX.Element {
  const [settings, setSettings] = useSettings()
  const tasks = useTasks()
  const stats = useStats()
  const player = usePlaylist()
  // Поднят в App, чтобы фоновые звуки продолжали играть при смене вкладок.
  const ambient = useAmbient()
  const [tab, setTab] = useState<TabId>('timer')
  const { theme } = useTheme(settings)

  // Завершённая фокус-сессия засчитывает помодоро активной задаче и в статистику.
  const handleFocusComplete = (minutes: number): void => {
    tasks.incrementActiveDone()
    stats.record(minutes)
  }

  const updateSettings = (patch: Partial<Settings>): void => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  return (
    <Phone theme={theme}>
      <StatusBar />
      {tab === 'timer' && (
        <TimerScreen
          settings={settings}
          activeTask={tasks.active}
          onFocusComplete={handleFocusComplete}
          musicPlaying={player.playing || ambient.anyOn}
        />
      )}
      {tab === 'tasks' && <TasksScreen tasks={tasks} />}
      {tab === 'stats' && <StatsScreen stats={stats} dailyGoal={settings.dailyGoal} />}
      {tab === 'playlist' && <PlaylistScreen player={player} ambient={ambient} />}
      {tab === 'settings' && <SettingsScreen settings={settings} onChange={updateSettings} />}
      <TabBar active={tab} onNav={setTab} />
    </Phone>
  )
}
