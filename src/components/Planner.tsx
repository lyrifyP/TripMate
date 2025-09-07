import React, { useContext, useMemo, useState } from 'react'
import { AppContext } from '../App'
import type { Area, PlanItem } from '../types'
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Pencil,
  Check,
  X,
} from 'lucide-react'

type AreaScope = 'All' | Area
type KindScope = 'All' | 'Activity' | 'Meal' | 'Note'
type DayScope = 'All days' | 'Samui days' | 'Doha days' | 'Today'

type Draft = {
  date: string
  time?: string
  area: Area
  kind: 'Activity' | 'Meal' | 'Note'
  title: string
  notes?: string
}

function todayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const ms = d.getTime() - d.getTimezoneOffset() * 60000
  return new Date(ms).toISOString().slice(0, 10)
}
const TODAY = todayISO()

export default function Planner() {
  const { state, setState } = useContext(AppContext)

  // filters
  const [q, setQ] = useState('')
  const [areaScope, setAreaScope] = useState<AreaScope>('All')
  const [kindScope, setKindScope] = useState<KindScope>('All')
  const [dayScope, setDayScope] = useState<DayScope>('All days')

  // add sheet
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>({
    date: TODAY,
    time: '',
    area: 'Samui',
    kind: 'Activity',
    title: '',
    notes: '',
  })

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState<Draft>({
    date: TODAY,
    time: '',
    area: 'Samui',
    kind: 'Activity',
    title: '',
    notes: '',
  })

  // derive groups
  const groups = useMemo(() => {
    const ql = q.trim().toLowerCase()
    const passQ = (p: PlanItem) => (ql ? `${p.title} ${p.notes ?? ''}`.toLowerCase().includes(ql) : true)
    const passArea = (p: PlanItem) => (areaScope === 'All' ? true : p.area === areaScope)
    const passKind = (p: PlanItem) => (kindScope === 'All' ? true : p.kind === kindScope)

    const byDate = new Map<string, PlanItem[]>()
    for (const p of state.plan) {
      if (!passQ(p) || !passArea(p) || !passKind(p)) continue
      if (!byDate.has(p.date)) byDate.set(p.date, [])
      byDate.get(p.date)!.push(p)
    }

    const parse = (t?: string) => {
      if (!t) return 24 * 60 + 1
      const [hh, mm] = t.split(':').map(Number)
      if (Number.isFinite(hh) && Number.isFinite(mm)) return hh * 60 + mm
      return 24 * 60 + 1
    }

    const days = Array.from(byDate.entries())
      .map(([date, items]) => {
        const sorted = [...items].sort((a, b) => {
          const ta = parse(a.time)
          const tb = parse(b.time)
          if (ta !== tb) return ta - tb
          if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
          return a.title.localeCompare(b.title)
        })
        return [date, sorted] as [string, PlanItem[]]
      })
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))

    const keep = (date: string, items: PlanItem[]) => {
      if (dayScope === 'All days') return true
      if (dayScope === 'Today') return date === TODAY
      if (dayScope === 'Samui days') return items.some(i => i.area === 'Samui')
      if (dayScope === 'Doha days') return items.some(i => i.area === 'Doha')
      return true
    }

    return days.filter(([date, items]) => keep(date, items))
  }, [state.plan, q, areaScope, kindScope, dayScope])

  function addItem() {
    const title = draft.title.trim()
    if (!title) return
    const item: PlanItem = {
      id: crypto.randomUUID(),
      date: draft.date,
      area: draft.area,
      time: draft.time?.trim() || undefined,
      kind: draft.kind,
      title,
      notes: draft.notes?.trim() || undefined,
    }
    setState(s => ({ ...s, plan: [...s.plan, item] }))
    setDraft(d => ({ ...d, title: '', notes: '' }))
    setOpen(false)
  }

  function remove(id: string) {
    setState(s => ({ ...s, plan: s.plan.filter(p => p.id !== id) }))
    if (editingId === id) setEditingId(null)
  }

  function beginEdit(item: PlanItem) {
    setEditingId(item.id)
    setEdit({
      date: item.date,
      time: item.time ?? '',
      area: item.area,
      kind: item.kind,
      title: item.title,
      notes: item.notes ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function saveEdit() {
    if (!editingId) return
    const title = edit.title.trim()
    if (!title) return
    setState(s => ({
      ...s,
      plan: s.plan.map(p =>
        p.id === editingId
          ? {
              ...p,
              date: edit.date,
              time: edit.time?.trim() || undefined,
              area: edit.area,
              kind: edit.kind,
              title,
              notes: edit.notes?.trim() || undefined,
            }
          : p
      ),
    }))
    setEditingId(null)
  }

  async function resetToDefaults() {
    if (!confirm('Reset the plan to its default, this cannot be undone')) return
    try {
      const mod = await import('../seed/plan.json')
      const raw = (mod as any).default as any[]
      const typed: PlanItem[] = raw.map(p => ({
        ...p,
        area: p.area as Area,
        kind: p.kind as 'Activity' | 'Meal' | 'Note',
      }))
      setState(s => ({ ...s, plan: typed }))
      setEditingId(null)
    } catch {
      alert('Could not load default plan')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarIcon size={18} /> Plan
          </h2>
          <div className="flex gap-2 flex-wrap">
            <button
              className="rounded-xl bg-white/15 px-3 py-1 text-sm backdrop-blur"
              onClick={() => setOpen(v => !v)}
            >
              {open ? 'Close' : 'Add item'}
            </button>
            <button
              className="rounded-xl bg-white/15 px-3 py-1 text-sm backdrop-blur"
              onClick={() => setDayScope('Today')}
              title="Show only today"
            >
              Today
            </button>
            <button
              className="rounded-xl bg-white/15 px-3 py-1 text-sm backdrop-blur flex items-center gap-2"
              onClick={resetToDefaults}
              title="Reset plan to defaults"
            >
              <RefreshCw size={14} />
              Reset
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative min-w-0">
            <span className="absolute left-2 top-2.5 opacity-80"><Search size={16} /></span>
            <input
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 placeholder-white/70 text-white border border-white/20"
              placeholder="Search title or notes"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['All days', 'Samui days', 'Doha days'] as const).map(v => (
              <button
                key={v}
                className={'px-3 py-1 rounded-lg text-sm ' + (dayScope === v ? 'bg-white/20' : 'bg-white/10')}
                onClick={() => setDayScope(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['All', 'Samui', 'Doha'] as const).map(v => (
              <button
                key={v}
                className={'px-3 py-1 rounded-lg text-sm ' + (areaScope === v ? 'bg-white/20' : 'bg-white/10')}
                onClick={() => setAreaScope(v)}
              >
                {v}
              </button>
            ))}
            {(['All', 'Activity', 'Meal', 'Note'] as const).map(v => (
              <button
                key={v}
                className={'px-3 py-1 rounded-lg text-sm ' + (kindScope === v ? 'bg-white/20' : 'bg-white/10')}
                onClick={() => setKindScope(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add sheet */}
      {open && (
        <div className="card p-4 space-y-3">
          <h3 className="section-title">Add to plan</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="card"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft(d => ({ ...d, date: e.target.value }))}
            />
            <input
              className="card"
              type="time"
              value={draft.time}
              onChange={(e) => setDraft(d => ({ ...d, time: e.target.value }))}
            />
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
              value={draft.kind}
              onChange={(e) => setDraft(d => ({ ...d, kind: e.target.value as Draft['kind'] }))}
            >
              <option>Activity</option>
              <option>Meal</option>
              <option>Note</option>
            </select>
            <input
              className="card col-span-2"
              placeholder="Title, for example Boat trip or Dinner at Long Dtai"
              value={draft.title}
              onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))}
            />
            <input
              className="card col-span-2"
              placeholder="Notes, optional"
              value={draft.notes}
              onChange={(e) => setDraft(d => ({ ...d, notes: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { title: 'Beach morning', area: 'Samui' as Area, kind: 'Activity' as const, time: '09:00' },
              { title: 'Long Dtai dinner', area: 'Samui' as Area, kind: 'Meal' as const, time: '19:30' },
              { title: 'Souq Waqif walk', area: 'Doha' as Area, kind: 'Activity' as const, time: '18:30' },
              { title: 'Msheireb dinner', area: 'Doha' as Area, kind: 'Meal' as const, time: '20:00' },
            ].map(p => (
              <button
                key={p.title}
                className="rounded-xl bg-gray-100 px-3 py-1 text-sm"
                onClick={() =>
                  setDraft(d => ({
                    ...d,
                    title: p.title,
                    area: p.area,
                    kind: p.kind,
                    time: p.time,
                  }))
                }
              >
                {p.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button className="tile flex items-center gap-2" onClick={addItem}>
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

      {/* Timeline */}
      {groups.length === 0 ? (
        <div className="card p-4 text-sm text-gray-600">Nothing to show with these filters</div>
      ) : (
        <div className="space-y-3">
          {groups.map(([date, items]) => (
            <DayCard
              key={date}
              date={date}
              items={items}
              editingId={editingId}
              edit={edit}
              setEdit={setEdit}
              onBeginEdit={beginEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              onRemove={remove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DayCard({
  date,
  items,
  editingId,
  edit,
  setEdit,
  onBeginEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: {
  date: string
  items: PlanItem[]
  editingId: string | null
  edit: Draft
  setEdit: React.Dispatch<React.SetStateAction<Draft>>
  onBeginEdit: (item: PlanItem) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onRemove: (id: string) => void
}) {
  const areas = Array.from(new Set(items.map(i => i.area)))
  const weekday = new Date(date).toLocaleDateString(undefined, { weekday: 'short' })
  const pretty = new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{weekday}, {pretty}</span>
          <span className="text-gray-400 text-xs">• {items.length}</span>
          <div className="flex gap-1">
            {areas.map(a => (
              <span
                key={a}
                className={'px-2 py-0.5 rounded-full text-xs ' + (a === 'Samui' ? 'bg-orange-50 text-orange-700' : 'bg-cyan-50 text-cyan-700')}
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {items.map(i => (
          <PlanRow
            key={i.id}
            item={i}
            editing={editingId === i.id}
            edit={edit}
            setEdit={setEdit}
            onBeginEdit={() => onBeginEdit(i)}
            onCancelEdit={onCancelEdit}
            onSaveEdit={onSaveEdit}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

function PlanRow({
  item,
  editing,
  edit,
  setEdit,
  onBeginEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: {
  item: PlanItem
  editing: boolean
  edit: Draft
  setEdit: React.Dispatch<React.SetStateAction<Draft>>
  onBeginEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onRemove: (id: string) => void
}) {
  if (editing) {
    return (
      <div className="py-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="card"
            type="date"
            value={edit.date}
            onChange={(e) => setEdit(d => ({ ...d, date: e.target.value }))}
          />
          <input
            className="card"
            type="time"
            value={edit.time}
            onChange={(e) => setEdit(d => ({ ...d, time: e.target.value }))}
          />
          <select
            className="card"
            value={edit.area}
            onChange={(e) => setEdit(d => ({ ...d, area: e.target.value as Area }))}
          >
            <option>Samui</option>
            <option>Doha</option>
          </select>
          <select
            className="card"
            value={edit.kind}
            onChange={(e) => setEdit(d => ({ ...d, kind: e.target.value as Draft['kind'] }))}
          >
            <option>Activity</option>
            <option>Meal</option>
            <option>Note</option>
          </select>
          <input
            className="card col-span-2"
            placeholder="Title"
            value={edit.title}
            onChange={(e) => setEdit(d => ({ ...d, title: e.target.value }))}
          />
          <input
            className="card col-span-2"
            placeholder="Notes, optional"
            value={edit.notes}
            onChange={(e) => setEdit(d => ({ ...d, notes: e.target.value }))}
          />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <button className="tile flex items-center gap-2" onClick={onSaveEdit}>
            <Check size={16} /> Save
          </button>
          <button
            className="rounded-xl px-3 py-2 text-sm text-gray-700 bg-gray-100 flex items-center gap-2"
            onClick={onCancelEdit}
          >
            <X size={16} /> Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0" title={item.kind}>
          <Clock size={16} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900">
            {item.time ? `${item.time}, ` : ''}{item.title}
          </div>
          <div className="text-xs text-gray-600">
            {item.kind}, {item.area}{item.notes ? `, ${item.notes}` : ''}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="rounded-xl p-2 hover:bg-gray-100 text-gray-600"
          onClick={onBeginEdit}
          aria-label="Edit"
          title="Edit"
        >
          <Pencil size={16} />
        </button>
        <button
          className="rounded-xl p-2 hover:bg-gray-100 text-gray-600"
          onClick={() => onRemove(item.id)}
          aria-label="Delete"
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
