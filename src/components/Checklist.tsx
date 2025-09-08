import React, { useContext, useMemo, useState, useEffect } from 'react'
import { AppContext } from '../App'
import type { Area } from '../types'
import {
  ListChecks,
  Plus,
  Trash2,
  Search,
} from 'lucide-react'

type TypeFilter = 'All' | 'Food' | 'Activity'
type AreaFilter = 'All' | Area

type Draft = {
  label: string
  note?: string
  area: Area
  type: 'Food' | 'Activity'
}

export default function Checklist() {
  const { state, setState } = useContext(AppContext)

  // filters
  const [area, setArea] = useState<AreaFilter>('All')
  const [kind, setKind] = useState<TypeFilter>('All')
  const [showDone, setShowDone] = useState(false)
  const [q, setQ] = useState('')

  // add sheet
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>({ label: '', note: '', area: 'Samui', type: 'Activity' })

  // clear and undo state
  const [confirmClear, setConfirmClear] = useState(false)
  const [undo, setUndo] = useState<{ visible: boolean, data: typeof state.checklist }>({ visible: false, data: [] })
  const undoTimer = React.useRef<number | null>(null)

  useEffect(() => {
    if (!confirmClear) return
    const id = window.setTimeout(() => setConfirmClear(false), 4000)
    return () => window.clearTimeout(id)
  }, [confirmClear])

  const isDefaultFilter = (f: {
    area: AreaFilter
    price?: unknown
    cuisine?: unknown
    tag?: unknown
    favOnly?: boolean
    q?: string
  }) =>
    f.area === 'All' &&
    kind === 'All' &&
    !showDone &&
    (q?.trim() ?? '') === ''

  // derived
  const items = state.checklist
    .filter(i => (area === 'All' ? true : i.area === area))
    .filter(i => (kind === 'All' ? true : i.type === kind))
    .filter(i => (showDone ? true : !i.done))
    .filter(i => {
      const s = q.trim().toLowerCase()
      if (!s) return true
      const hay = `${i.label} ${i.note ?? ''}`.toLowerCase()
      return hay.includes(s)
    })

  const counts = useMemo(() => {
    const total = state.checklist.length
    const done = state.checklist.filter(i => i.done).length
    const left = total - done
    return { total, done, left }
  }, [state.checklist])

  function addItem() {
    const label = draft.label.trim()
    const note = (draft.note ?? '').trim()
    if (!label) return
    const item = {
      id: crypto.randomUUID(),
      area: draft.area,
      type: draft.type,
      label,
      note: note || undefined,
      done: false,
    }
    setState(s => ({ ...s, checklist: [item, ...s.checklist] }))
    setDraft(d => ({ ...d, label: '', note: '' }))
    setOpen(false)
  }

  function toggle(id: string) {
    setState(s => ({
      ...s,
      checklist: s.checklist.map(i => (i.id === id ? { ...i, done: !i.done } : i)),
    }))
  }

  function remove(id: string) {
    setState(s => ({ ...s, checklist: s.checklist.filter(i => i.id !== id) }))
  }

  function clearDone() {
    const doneItems = state.checklist.filter(i => i.done)
    if (doneItems.length === 0) return

    if (undoTimer.current) {
      window.clearTimeout(undoTimer.current)
      undoTimer.current = null
    }
    setUndo({ visible: true, data: state.checklist })

    setState(s => ({ ...s, checklist: s.checklist.filter(i => !i.done) }))

    undoTimer.current = window.setTimeout(() => {
      setUndo(u => ({ ...u, visible: false }))
      undoTimer.current = null
    }, 5000) as unknown as number

    setConfirmClear(false)
  }

  function undoClear() {
    if (!undo.visible) return
    if (undoTimer.current) {
      window.clearTimeout(undoTimer.current)
      undoTimer.current = null
    }
    setState(s => ({ ...s, checklist: undo.data }))
    setUndo({ visible: false, data: [] })
  }

  // group by Area, then Type
  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const i of items) {
      const key = `${i.area}-${i.type}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(i)
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])

  return (
    <div className="space-y-4">
      {/* Gradient header */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListChecks size={18} /> Lists
          </h2>
          <button
            className="rounded-xl bg-white/15 px-3 py-1 text-sm backdrop-blur"
            onClick={() => setOpen(v => !v)}
          >
            {open ? 'Close' : 'Add item'}
          </button>
        </div>

        {/* Progress chips */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Chip label="Total" value={counts.total} />
          <Chip label="Done" value={counts.done} />
          <Chip label="Left" value={counts.left} />
        </div>

        {/* Filters */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative min-w-0">
            <span className="absolute left-2 top-2.5 opacity-80"><Search size={16} /></span>
            <input
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 placeholder-white/70 text-white border border-white/20"
              placeholder="Search items"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['All', 'Samui', 'Doha'] as const).map(v => (
              <button
                key={v}
                className={'px-3 py-1 rounded-lg text-sm ' + (area === v ? 'bg-white/20' : 'bg-white/10')}
                onClick={() => setArea(v)}
              >
                {v}
              </button>
            ))}
            <button
              className={'px-3 py-1 rounded-lg text-sm ' + (showDone ? 'bg-white/20' : 'bg-white/10')}
              onClick={() => setShowDone(v => !v)}
            >
              {showDone ? 'Showing done' : 'Hide done'}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['All', 'Food', 'Activity'] as const).map(v => (
              <button
                key={v}
                className={'px-3 py-1 rounded-lg text-sm ' + (kind === v ? 'bg-white/20' : 'bg-white/10')}
                onClick={() => setKind(v)}
              >
                {v}
              </button>
            ))}
            {confirmClear ? (
              <button
                className="px-3 py-1 rounded-lg text-sm bg-red-500 text-white"
                onClick={clearDone}
                title="Remove all completed items"
              >
                Confirm clear ({counts.done})
              </button>
            ) : (
              <button
                className="px-3 py-1 rounded-lg text-sm bg-white/10 disabled:opacity-40"
                onClick={() => setConfirmClear(true)}
                disabled={counts.done === 0}
                title={counts.done === 0 ? 'No completed items' : 'Prepare to clear completed items'}
              >
                Clear done
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add sheet */}
      {open && (
        <div className="card p-4 space-y-3">
          <h3 className="section-title">Add an item</h3>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="card"
              value={draft.area}
              onChange={(e) => setDraft(d => ({ ...d, area: e.target.value as Area }))}
            >
              <option>Samui</option>
              <option>Doha</option>
            </select>
            <select
              className="card"
              value={draft.type}
              onChange={(e) => setDraft(d => ({ ...d, type: e.target.value as Draft['type'] }))}
            >
              <option>Activity</option>
              <option>Food</option>
            </select>
            <input
              className="card col-span-2"
              placeholder="Label, for example Night market or Sunset drinks"
              value={draft.label}
              onChange={(e) => setDraft(d => ({ ...d, label: e.target.value }))}
            />
            <input
              className="card col-span-2"
              placeholder="Optional note, for example evening fire shows"
              value={draft.note ?? ''}
              onChange={(e) => setDraft(d => ({ ...d, note: e.target.value }))}
            />
          </div>

          {/* quick presets */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Night market', note: 'Street food and stalls', area: 'Samui' as Area, type: 'Food' as const },
              { label: 'Sunset drinks', note: 'Beachfront if possible', area: 'Samui' as Area, type: 'Activity' as const },
              { label: 'Massage', note: '60 to 90 mins', area: 'Samui' as Area, type: 'Activity' as const },
              { label: 'Msheireb evening', note: 'Walk and photo spots', area: 'Doha' as Area, type: 'Activity' as const },
              { label: 'Souq dinner', note: 'Parisa or Turkey Central', area: 'Doha' as Area, type: 'Food' as const },
            ].map(p => (
              <button
                key={p.label}
                className="rounded-xl bg-gray-100 px-3 py-1 text-sm"
                onClick={() => setDraft({ label: p.label, note: p.note, area: p.area, type: p.type })}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button className="tile" onClick={addItem}>
              <Plus size={16} /> Add item
            </button>
            <button
              className="rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-100"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Groups */}
      {grouped.length === 0 ? (
        <div className="card p-4 text-sm text-gray-600">Nothing to show with these filters</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([key, rows]) => {
            const [gArea, gType] = key.split('-') as [Area, 'Food' | 'Activity']
            return (
              <div key={key} className="card p-3">
                <div className="mb-2 flex items-center gap-2 text-sm">
                  <span className={'px-2 py-0.5 rounded-full ' + (gArea === 'Samui' ? 'bg-orange-50 text-orange-700' : 'bg-cyan-50 text-cyan-700')}>
                    {gArea}
                  </span>
                  <span className="text-gray-600">{gType}</span>
                  <span className="text-gray-400 text-xs">• {rows.length}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {rows.map(i => (
                    <Row
                      key={i.id}
                      id={i.id}
                      label={i.label}
                      note={i.note}
                      done={i.done}
                      onToggle={toggle}
                      onRemove={remove}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Undo toast */}
      {undo.visible && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-20 z-50">
          <div className="rounded-2xl bg-gray-900 text-white px-4 py-2 text-sm shadow-lg flex items-center gap-3">
            <span>Completed items cleared</span>
            <button
              className="rounded-lg bg-white/10 px-2 py-1 text-xs"
              onClick={undoClear}
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ label, value }: { label: string, value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 text-white">
      <div className="text-xs opacity-80">{label}</div>
      <div className="mt-0.5 text-base font-semibold">{value}</div>
    </div>
  )
}

function Row({
  id,
  label,
  note,
  done,
  onToggle,
  onRemove,
}: {
  id: string
  label: string
  note?: string
  done: boolean
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="py-2 flex items-center justify-between gap-3">
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={done}
          onChange={() => onToggle(id)}
          className="mt-0.5 h-5 w-5 rounded border-gray-300"
        />
        <span className="flex flex-col">
          <span className={'text-sm ' + (done ? 'line-through text-gray-500' : 'text-gray-900')}>
            {label}
          </span>
          {note ? (
            <span className="text-xs text-gray-600">
              {note}
            </span>
          ) : null}
        </span>
      </label>
      <button
        className="rounded-xl p-2 hover:bg-gray-100 text-gray-600"
        onClick={() => onRemove(id)}
        aria-label="Delete item"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
