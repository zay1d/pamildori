import { useCallback, useMemo } from 'react'
import { usePersistedState } from './usePersistedState'
import { STORAGE_KEYS } from '../storage/storage'
import { Task } from '../types'

// ============================================================
// useTasks — список задач с автосохранением + «активная задача».
//
// Активная задача показывается над таймером; каждое завершение фокус-сессии
// засчитывает ей один помодоро (incrementActiveDone). Когда план выполнен,
// задача помечается завершённой и снимается с активной.
// ============================================================

const TITLE_MAX = 120
const EST_MIN = 1
const EST_MAX = 20

function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
const clampEst = (n: number): number => Math.max(EST_MIN, Math.min(EST_MAX, Math.floor(n) || EST_MIN))

export interface TasksApi {
  tasks: Task[]
  loaded: boolean
  activeId: string | null
  active: Task | null
  add: (title: string, estimate?: number) => void
  remove: (id: string) => void
  toggleComplete: (id: string) => void
  setEstimate: (id: string, estimate: number) => void
  rename: (id: string, title: string) => void
  setActive: (id: string | null) => void
  /** Засчитать один помодоро активной задаче (вызывается при завершении фокуса). */
  incrementActiveDone: () => void
}

export function useTasks(): TasksApi {
  const [tasks, setTasks, loadedT] = usePersistedState<Task[]>(STORAGE_KEYS.tasks, [])
  const [activeId, setActiveId, loadedA] = usePersistedState<string | null>(STORAGE_KEYS.activeTask, null)

  const add = useCallback(
    (title: string, estimate = 1) => {
      const t = title.trim()
      if (!t) return
      const task: Task = {
        id: uid(),
        title: t.slice(0, TITLE_MAX),
        estimate: clampEst(estimate),
        done: 0,
        completed: false,
        createdAt: Date.now(),
      }
      setTasks((prev) => [task, ...prev])
    },
    [setTasks],
  )

  const remove = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((x) => x.id !== id))
      setActiveId((cur) => (cur === id ? null : cur))
    },
    [setTasks, setActiveId],
  )

  const toggleComplete = useCallback(
    (id: string) => {
      setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, completed: !x.completed } : x)))
      // Завершённая задача не может быть активной.
      setActiveId((cur) => {
        if (cur !== id) return cur
        const willComplete = !tasks.find((x) => x.id === id)?.completed
        return willComplete ? null : cur
      })
    },
    [setTasks, setActiveId, tasks],
  )

  const setEstimate = useCallback(
    (id: string, estimate: number) => {
      setTasks((prev) =>
        prev.map((x) => (x.id === id ? { ...x, estimate: Math.max(clampEst(estimate), x.done || EST_MIN) } : x)),
      )
    },
    [setTasks],
  )

  const rename = useCallback(
    (id: string, title: string) => {
      const t = title.trim()
      if (!t) return
      setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, title: t.slice(0, TITLE_MAX) } : x)))
    },
    [setTasks],
  )

  const setActive = useCallback(
    (id: string | null) => {
      // Тап по уже активной задаче снимает выбор; завершённую выбрать нельзя.
      setActiveId((cur) => {
        if (id === null) return null
        if (cur === id) return null
        if (tasks.find((x) => x.id === id)?.completed) return cur
        return id
      })
    },
    [setActiveId, tasks],
  )

  const incrementActiveDone = useCallback(() => {
    if (!activeId) return
    const cur = tasks.find((x) => x.id === activeId)
    if (!cur || cur.completed) return
    setTasks((prev) =>
      prev.map((x) => {
        if (x.id !== activeId) return x
        const done = x.done + 1
        return { ...x, done, completed: x.completed || done >= x.estimate }
      }),
    )
    // План выполнен — снимаем задачу с активной.
    if (cur.done + 1 >= cur.estimate) setActiveId(null)
  }, [activeId, tasks, setTasks, setActiveId])

  const active = useMemo(() => tasks.find((x) => x.id === activeId) ?? null, [tasks, activeId])

  return {
    tasks,
    loaded: loadedT && loadedA,
    activeId,
    active,
    add,
    remove,
    toggleComplete,
    setEstimate,
    rename,
    setActive,
    incrementActiveDone,
  }
}
