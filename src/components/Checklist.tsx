import React, { useContext, useMemo, useState } from 'react'
import { AppContext } from '../App'
import type { Area } from '../types'

export default function Checklists() {
  const { state, setState } = useContext(AppContext)
  const [area, setArea] = useState<'All'|Area>('All')
  const [kind, setKind] = useState<'All'|'Food'|'Activity'>('All')
  const [q, setQ] = useState('')

  const items = useMemo(() => {
    return state.checklist.filter(i => {
      if (area !== 'All' && i.area !== area) return false
      if (kind !== 'All' && i.type !== kind) return false
      if (q && !i.label.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [state.checklist, area, kind, q])

  function toggle(id: string) { setState(s => ({ ...s, checklist: s.checklist.map(i => i.id === id ? { ...i, done: !i.done } : i) })) }
  function addItem() {
    const label = prompt('Item label'); if (!label) return
    setState(s => ({
      ...s,
      checklist: [
        ...s.checklist,
        { id: crypto.randomUUID(), area: 'Samui', type: 'Activity', label, done: false }
      ]
    }))
      }

  return (
    <div className="space-y-3">
      <div className="card-lg grid grid-cols-2 gap-2">
        <input className="card col-span-2" placeholder="Search items" value={q} onChange={e => setQ(e.target.value)} />
        <select className="card" value={area} onChange={e => setArea(e.target.value as any)}>
          <option>All</option><option>Samui</option><option>Doha</option>
        </select>
        <select className="card" value={kind} onChange={e => setKind(e.target.value as any)}>
          <option>All</option><option>Food</option><option>Activity</option>
        </select>
        <button className="tile" onClick={addItem}>Add</button>
      </div>
      <div className="space-y-2">
        {items.map(i => (
          <label key={i.id} className="flex items-center gap-3 border border-gray-200 rounded-2xl p-3">
            <input type="checkbox" checked={i.done} onChange={() => toggle(i.id)} className="h-6 w-6" />
            <div>
              <div className="font-medium">{i.label}</div>
              <div className="text-xs text-gray-500">{i.area} • {i.type}</div>
            </div>
          </label>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-600">No items</p>}
      </div>
    </div>
  )
}
