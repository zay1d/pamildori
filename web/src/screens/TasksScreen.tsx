// ============================================================
// TasksScreen.tsx — список задач (pixel / dark-academia edition).
// Добавление, оценка в помидорах, прогресс, выбор активной задачи,
// переименование, удаление. Активная задача питает чип над таймером.
// ============================================================
import { useState } from 'react'
import type { ChangeEvent } from 'react'
import type { CSSProperties } from 'react'
import type { TasksApi } from '../hooks/useTasks'
import type { Task } from '../types'

const EST_MAX = 20
const PIP_CAP = 8 // сколько помидоров рисуем «глазами», прежде чем перейти к счётчику

/** Подогнать высоту textarea под содержимое, чтобы был виден весь текст. */
function autoGrow(el: HTMLTextAreaElement | null): void {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/** Ряд помидоров: done закрашены, остальные приглушены; при большом плане — счётчик. */
function Pips({ done, estimate }: { done: number; estimate: number }): JSX.Element {
  if (estimate > PIP_CAP) {
    return (
      <span className="font-ui" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
        🍅 {done}/{estimate}
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', gap: 2, lineHeight: 1 }}>
      {Array.from({ length: estimate }).map((_, i) => (
        <span key={i} style={{ fontSize: 11, opacity: i < done ? 1 : 0.28, filter: i < done ? 'none' : 'grayscale(0.4)' }}>
          🍅
        </span>
      ))}
    </span>
  )
}

function Stepper({
  value,
  min = 1,
  max = EST_MAX,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  onChange: (n: number) => void
}): JSX.Element {
  const btn: CSSProperties = {
    width: 24,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DotGothic16', monospace",
    fontSize: 16,
    color: 'var(--ink-soft)',
    lineHeight: 1,
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button className="pf" style={btn} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Less">
        −
      </button>
      <span className="font-ui" style={{ minWidth: 28, textAlign: 'center', fontSize: 13, color: 'var(--ink)' }}>
        {value}🍅
      </span>
      <button className="pf" style={btn} onClick={() => onChange(Math.min(max, value + 1))} aria-label="More">
        +
      </button>
    </div>
  )
}

function AddForm({ onAdd }: { onAdd: (title: string, estimate: number) => void }): JSX.Element {
  const [title, setTitle] = useState('')
  const [est, setEst] = useState(1)
  const submit = (): void => {
    if (!title.trim()) return
    onAdd(title, est)
    setTitle('')
    setEst(1)
  }
  return (
    <div className="pf" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="New quest…"
        maxLength={120}
        className="pf-inset"
        style={{
          padding: '8px 10px',
          fontFamily: "'DotGothic16', monospace",
          fontSize: 14,
          color: 'var(--ink)',
          background: 'var(--bg)',
          border: '2px solid var(--bg-2)',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Stepper value={est} onChange={setEst} />
        <button
          className="pf-brass"
          onClick={submit}
          disabled={!title.trim()}
          style={{
            padding: '8px 18px',
            fontFamily: "'DotGothic16', monospace",
            fontSize: 14,
            fontWeight: 600,
            opacity: title.trim() ? 1 : 0.5,
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}

function TaskRow({
  task,
  active,
  onToggle,
  onSetActive,
  onRemove,
  onRename,
  onEstimate,
}: {
  task: Task
  active: boolean
  onToggle: () => void
  onSetActive: () => void
  onRemove: () => void
  onRename: (title: string) => void
  onEstimate: (n: number) => void
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)

  const commit = (): void => {
    setEditing(false)
    if (draft.trim() && draft.trim() !== task.title) onRename(draft)
    else setDraft(task.title)
  }

  const iconBtn: CSSProperties = {
    width: 30,
    height: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DotGothic16', monospace",
    fontSize: 14,
    lineHeight: 1,
    flex: '0 0 auto',
  }

  return (
    <div
      className={active ? 'pf-raised' : 'pf'}
      style={{
        padding: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: task.completed ? 0.6 : 1,
        boxShadow: active ? 'inset 0 0 0 2px var(--brass)' : undefined,
      }}
    >
      {/* done checkbox */}
      <button
        className="pf-inset"
        onClick={onToggle}
        aria-label={task.completed ? 'Mark not done' : 'Mark done'}
        style={{
          width: 26,
          height: 26,
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--brass-2)',
          fontFamily: "'Jersey 25', monospace",
          fontSize: 11,
        }}
      >
        {task.completed ? '✓' : ''}
      </button>

      {/* title + pips */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {editing ? (
          <textarea
            autoFocus
            ref={autoGrow}
            value={draft}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              setDraft(e.target.value)
              autoGrow(e.target)
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              // Enter — сохранить (перенос строки не нужен), Shift+Enter — перенос.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                commit()
              }
              if (e.key === 'Escape') {
                setEditing(false)
                setDraft(task.title)
              }
            }}
            maxLength={120}
            rows={1}
            className="pf-inset"
            style={{
              padding: '4px 6px',
              fontFamily: "'DotGothic16', monospace",
              fontSize: 14,
              lineHeight: 1.35,
              color: 'var(--ink)',
              background: 'var(--bg)',
              border: '2px solid var(--bg-2)',
              outline: 'none',
              width: '100%',
              resize: 'none',
              overflow: 'hidden',
            }}
          />
        ) : (
          <button
            onClick={() => {
              setDraft(task.title)
              setEditing(true)
            }}
            title="Rename"
            className="font-ui"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              textAlign: 'left',
              cursor: 'text',
              fontSize: 14,
              lineHeight: 1.35,
              color: 'var(--ink)',
              textDecoration: task.completed ? 'line-through' : 'none',
              whiteSpace: 'normal',
              overflowWrap: 'anywhere',
            }}
          >
            {task.title}
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pips done={task.done} estimate={task.estimate} />
          {!task.completed && (
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <button
                className="pf"
                style={{ width: 20, height: 20, fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1 }}
                onClick={() => onEstimate(task.estimate - 1)}
                aria-label="Fewer pomodoros"
              >
                −
              </button>
              <button
                className="pf"
                style={{ width: 20, height: 20, fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1 }}
                onClick={() => onEstimate(task.estimate + 1)}
                aria-label="More pomodoros"
              >
                +
              </button>
            </span>
          )}
        </div>
      </div>

      {/* set active */}
      {!task.completed && (
        <button
          className={active ? 'pf-brass' : 'pf'}
          onClick={onSetActive}
          title={active ? 'Active task' : 'Set as active'}
          style={{ ...iconBtn, color: active ? '#221603' : 'var(--ink-faint)' }}
        >
          ❧
        </button>
      )}
      {/* delete */}
      <button
        className="pf"
        onClick={onRemove}
        title="Delete"
        style={{ ...iconBtn, color: 'var(--crimson-2)' }}
      >
        ✕
      </button>
    </div>
  )
}

export function TasksScreen({ tasks }: { tasks: TasksApi }): JSX.Element {
  const open = tasks.tasks.filter((t) => !t.completed)
  const done = tasks.tasks.filter((t) => t.completed)
  const planned = open.reduce((s, t) => s + Math.max(0, t.estimate - t.done), 0)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 16px 0', gap: 10, overflow: 'hidden' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="font-disp" style={{ fontSize: 14, color: 'var(--brass-2)' }}>
          Quests
        </span>
        <span className="font-label" style={{ fontSize: 9, color: 'var(--ink-faint)' }}>
          {open.length} open · {planned}🍅 to go
        </span>
      </div>

      <AddForm onAdd={tasks.add} />

      {/* list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12 }}>
        {tasks.tasks.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textAlign: 'center',
              color: 'var(--ink-faint)',
              padding: '24px 0',
            }}
          >
            <span style={{ fontSize: 28, opacity: 0.7 }}>❦</span>
            <span className="font-ui" style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
              No quests yet
            </span>
            <span className="font-label" style={{ fontSize: 9 }}>
              Add your first above
            </span>
          </div>
        ) : (
          <>
            {open.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                active={t.id === tasks.activeId}
                onToggle={() => tasks.toggleComplete(t.id)}
                onSetActive={() => tasks.setActive(t.id)}
                onRemove={() => tasks.remove(t.id)}
                onRename={(title) => tasks.rename(t.id, title)}
                onEstimate={(n) => tasks.setEstimate(t.id, n)}
              />
            ))}
            {done.length > 0 && (
              <div className="font-label" style={{ fontSize: 9, color: 'var(--ink-faint)', margin: '6px 2px 0' }}>
                Done · {done.length}
              </div>
            )}
            {done.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                active={false}
                onToggle={() => tasks.toggleComplete(t.id)}
                onSetActive={() => tasks.setActive(t.id)}
                onRemove={() => tasks.remove(t.id)}
                onRename={(title) => tasks.rename(t.id, title)}
                onEstimate={(n) => tasks.setEstimate(t.id, n)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
