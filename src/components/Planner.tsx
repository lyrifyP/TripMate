import React, { useContext, useMemo, useState } from 'react'
import { AppContext } from '../App'
import type { PlanItem } from '../types'
import { fmtDate } from '../lib/utils'

export default function Planner() {
  const { state, setState } = useContext(AppContext)
  const [filter, setFilter] = useState<'All'|'Samui'|'Doha'>('All')

  const days = useMemo(() => {
    const byDate: Record<string, PlanItem[]> = {}
    for (const item of state.plan) {
      if (!byDate[item.date]) byDate[item.date] = []
      byDate[item.date].push(item)
    }
    const entries = Object.entries(byDate).map(([date, items]) => ({ date, items: items.sort((a,b) => (a.time||'').localeCompare(b.time||'')) }))
    return entries.sort((a,b) => a.date.localeCompare(b.date))
  }, [state.plan])

  function addItem(date: string) {
    const title = prompt('Title'); if (!title) return
    setState(s => ({ ...s, plan: [...s.plan, { id: crypto.randomUUID(), date, area: 'Samui', kind: 'Activity', title }] }))
  }
  function resetPlan() {
    if (!confirm('Reset to default plan')) return
    location.reload()
  }

  return (
    <div className="space-y-3">
      <div className="card-lg grid grid-cols-3 gap-2">
        <select className="card col-span-2" value={filter} onChange={e => setFilter(e.target.value as any)}>
          <option>All</option><option>Samui</option><option>Doha</option>
        </select>
        <button className="tile" onClick={resetPlan}>Reset</button>
      </div>

      <div className="space-y-3">
        {days.map(day => {
          const items = day.items.filter(i => filter === 'All' || i.area === filter)
          return (
            <div key={day.date} id={'day-' + day.date} className="card-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">{fmtDate(day.date)}</div>
                <button className="tile" onClick={() => addItem(day.date)}>Add</button>
              </div>
              <div className="space-y-2">
                {items.map(i => (
                  <div key={i.id} className="border border-gray-200 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{i.title} <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs">{i.area}</span></div>
                      <div className="text-xs text-gray-500">{i.kind}{i.time ? ` • ${i.time}` : ''}</div>
                      {i.notes && <div className="text-xs">{i.notes}</div>}
                    </div>
                    <button className="tile" onClick={() => setState(s => ({ ...s, plan: s.plan.filter(x => x.id !== i.id) }))}>Delete</button>
                  </div>
                ))}
                {items.length === 0 && <p className="text-sm text-gray-600">No items for this filter</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
