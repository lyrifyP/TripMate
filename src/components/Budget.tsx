import React, { useContext, useState } from 'react'
import { AppContext } from '../App'
import type { Area, Spend } from '../types'
import { exportToFile, importFromFile } from '../lib/storage'
import { formatGBP } from '../lib/currency'

export default function Budget() {
  const { state, setState } = useContext(AppContext)
  const [form, setForm] = useState<Spend>({
    id: crypto.randomUUID(),
    date: new Date().toISOString().slice(0,10),
    area: 'Samui',
    label: '',
    currency: 'GBP',
    amount: 0,
    notes: ''
  })
  const spends = state.spends.slice().sort((a,b) => a.date.localeCompare(b.date))

  function addSpend() {
    if (!form.label || form.amount <= 0) return alert('Enter a label and positive amount')
    setState(s => ({...s, spends: [...s.spends, form]}))
    setForm({ ...form, id: crypto.randomUUID(), label: '', amount: 0, notes: '' })
  }
  function del(id: string) { setState(s => ({...s, spends: s.spends.filter(x => x.id !== id)})) }

  // totals to GBP
  function toGBP(spend: Spend) {
    const r = state.rates
    if (spend.currency === 'GBP') return spend.amount
    if (spend.currency === 'THB') return spend.amount / r.THB
    if (spend.currency === 'QAR') return spend.amount / r.QAR
    return spend.amount
  }
  const totals = state.spends.reduce((acc, s) => {
    const v = toGBP(s); acc.overall += v; acc[s.area] += v; return acc
  }, { overall: 0, Samui: 0, Doha: 0 } as any)

  return (
    <div className="space-y-3">
      <div className="card-lg">
        <h3 className="section-title">Add spend</h3>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input className="card" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          <select className="card" value={form.area} onChange={e => setForm({...form, area: e.target.value as Area})}>
            <option>Samui</option><option>Doha</option>
          </select>
          <input className="card" placeholder="Label" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
          <select className="card" value={form.currency} onChange={e => setForm({...form, currency: e.target.value as any})}>
            <option>GBP</option><option>THB</option><option>QAR</option>
          </select>
          <input className="card" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} />
          <input className="card" placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        </div>
        <button className="tile w-full mt-2" onClick={addSpend}>Add spend</button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center"><div className="text-xs text-gray-500">Samui</div><div className="font-semibold">{formatGBP(totals.Samui)}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Doha</div><div className="font-semibold">{formatGBP(totals.Doha)}</div></div>
        <div className="card text-center"><div className="text-xs text-gray-500">Overall</div><div className="font-semibold">{formatGBP(totals.overall)}</div></div>
      </div>

      <div className="card-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="section-title">Spends</h3>
          <div className="flex gap-2">
            <button className="tile" onClick={() => exportToFile(state)}>Export</button>
            <button className="tile" onClick={async () => { try { const data = await importFromFile(); setState(data) } catch { alert('Import failed') } }}>Import</button>
          </div>
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
          {spends.map(s => (
            <div key={s.id} className="border border-gray-200 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{s.label} <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs">{s.area}</span></div>
                <div className="text-xs text-gray-500">{s.date} • {s.currency} {s.amount.toFixed(2)}</div>
                {s.notes && <div className="text-xs text-gray-600 mt-1">{s.notes}</div>}
              </div>
              <button className="tile" onClick={() => del(s.id)}>Delete</button>
            </div>
          ))}
          {spends.length === 0 && <p className="text-sm text-gray-600">No spends yet</p>}
        </div>
      </div>
    </div>
  )
}
