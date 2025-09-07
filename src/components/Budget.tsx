import React, { useMemo, useState, useContext, useEffect } from 'react'
import { AppContext } from '../App'
import type { Area, Currency } from '../types'
import { convert, formatGBP } from '../lib/currency'
import {
  Plus,
  Trash2,
  Wallet,
  Coins,
  Filter as FilterIcon,
  Search,
  PoundSterling,
  Utensils,
  Plane,
} from 'lucide-react'

type NewSpend = {
  date: string
  area: Area
  label: string
  currency: Currency
  amount: number
  notes?: string
}

const TODAY = new Date().toISOString().slice(0, 10)

export default function Budget() {
  const { state, setState } = useContext(AppContext)

  // filters
  const [areaFilter, setAreaFilter] = useState<'All' | Area>('All')
  const [query, setQuery] = useState('')

  // add sheet
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NewSpend>({
    date: TODAY,
    area: 'Samui',
    label: '',
    currency: 'THB',
    amount: 0,
    notes: '',
  })

  // choose default currency by area
  useEffect(() => {
    setDraft(d => ({
      ...d,
      currency: d.area === 'Samui' ? 'THB' : 'QAR',
    }))
  }, [draft.area])

  const filteredSpends = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.spends
      .filter(s => (areaFilter === 'All' ? true : s.area === areaFilter))
      .filter(s => (q ? `${s.label} ${s.notes ?? ''}`.toLowerCase().includes(q) : true))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [state.spends, areaFilter, query])

  const totals = useMemo(() => {
    const toGBP = (amt: number, cur: Currency) => convert(amt, cur, 'GBP', state.rates)
    let gbpAll = 0, gbpSamui = 0, gbpDoha = 0
    for (const s of state.spends) {
      const g = toGBP(s.amount, s.currency)
      gbpAll += g
      if (s.area === 'Samui') gbpSamui += g
      if (s.area === 'Doha') gbpDoha += g
    }
    return {
      all: gbpAll,
      samui: gbpSamui,
      doha: gbpDoha,
    }
  }, [state.spends, state.rates])

  const rateTHB = state.rates.THB
  const rateQAR = state.rates.QAR

  function addSpend() {
    if (!draft.label || !draft.amount) return
    const spend = {
      id: crypto.randomUUID(),
      date: draft.date,
      area: draft.area,
      label: draft.label,
      currency: draft.currency,
      amount: Number(draft.amount),
      notes: draft.notes?.trim() || undefined,
    }
    setState(s => ({ ...s, spends: [spend, ...s.spends] }))
    setDraft(d => ({ ...d, label: '', amount: 0, notes: '' }))
    setOpen(false)
  }

  function removeSpend(id: string) {
    setState(s => ({ ...s, spends: s.spends.filter(x => x.id !== id) }))
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wallet size={18} /> Budget
          </h2>
          <button
            className="rounded-xl bg-white/15 px-3 py-1 text-sm backdrop-blur"
            onClick={() => setOpen(v => !v)}
          >
            {open ? 'Close' : 'Add spend'}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <SummaryCard title="Overall" value={formatGBP(totals.all)} icon={<PoundSterling size={16} />} />
          <SummaryCard title="Samui" value={formatGBP(totals.samui)} icon={<Utensils size={16} />} />
          <SummaryCard title="Doha" value={formatGBP(totals.doha)} icon={<Plane size={16} />} />
        </div>

        <div className="mt-3 text-xs text-white/90">
          Live rates, 1 GBP is about {rateTHB?.toFixed(1)} THB, {rateQAR?.toFixed(2)} QAR
          {state.rates.manualOverride ? ', manual override is on' : ''}
        </div>
      </div>

      {/* Controls */}
      <div className="card p-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-2 top-2.5 opacity-60">
              <Search size={16} />
            </span>
            <input
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none"
              placeholder="Search label or notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="rounded-xl bg-gray-100 p-1 flex">
            {(['All', 'Samui', 'Doha'] as const).map(v => (
              <button
                key={v}
                className={
                  'px-3 py-1 rounded-lg text-sm ' +
                  (areaFilter === v ? 'bg-white shadow text-gray-900' : 'text-gray-600')
                }
                onClick={() => setAreaFilter(v)}
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
          <h3 className="section-title">Add a spend</h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="card"
              type="date"
              value={draft.date}
              onChange={(e) => setDraft(d => ({ ...d, date: e.target.value }))}
            />
            <select
              className="card"
              value={draft.area}
              onChange={(e) => setDraft(d => ({ ...d, area: e.target.value as Area }))}
            >
              <option>Samui</option>
              <option>Doha</option>
            </select>

            <input
              className="card col-span-2"
              placeholder="Label, for example Taxi from airport"
              value={draft.label}
              onChange={(e) => setDraft(d => ({ ...d, label: e.target.value }))}
            />

            <select
              className="card"
              value={draft.currency}
              onChange={(e) => setDraft(d => ({ ...d, currency: e.target.value as Currency }))}
            >
              <option>THB</option>
              <option>QAR</option>
              <option>GBP</option>
            </select>

            <input
              className="card"
              type="number"
              min={0}
              step="0.01"
              placeholder="Amount"
              value={draft.amount}
              onChange={(e) => setDraft(d => ({ ...d, amount: Number(e.target.value) }))}
            />

            <input
              className="card col-span-2"
              placeholder="Notes, optional"
              value={draft.notes}
              onChange={(e) => setDraft(d => ({ ...d, notes: e.target.value }))}
            />
          </div>

          {/* quick presets */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Coffee', amt: 120, cur: 'THB' as Currency },
              { label: 'Taxi', amt: 250, cur: 'THB' as Currency },
              { label: 'Water', amt: 20, cur: 'THB' as Currency },
              { label: 'Dinner', amt: 80, cur: 'QAR' as Currency },
            ].map(p => (
              <button
                key={p.label + p.amt + p.cur}
                className="rounded-xl bg-gray-100 px-3 py-1 text-sm"
                onClick={() =>
                  setDraft(d => ({ ...d, label: p.label, amount: p.amt, currency: p.cur }))
                }
              >
                {p.label} {p.amt} {p.cur}
              </button>
            ))}
          </div>

          {/* GBP equivalent preview */}
          <div className="text-sm text-gray-600">
            {draft.amount > 0 && (
              <span>
                About {formatGBP(convert(draft.amount, draft.currency, 'GBP', state.rates))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="tile flex items-center gap-2" onClick={addSpend}>
              <Plus size={16} /> Add spend
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

      {/* List */}
      <SpendList
        spends={filteredSpends}
        onRemove={removeSpend}
        rates={{
          THB: rateTHB,
          QAR: rateQAR,
        }}
      />
    </div>
  )
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 text-white">
      <div className="text-xs opacity-80">{title}</div>
      <div className="mt-0.5 text-base font-semibold flex items-center gap-2">
        {icon} {value}
      </div>
    </div>
  )
}

function SpendList({
  spends,
  onRemove,
  rates,
}: {
  spends: {
    id: string
    date: string
    area: Area
    label: string
    currency: Currency
    amount: number
    notes?: string
  }[]
  onRemove: (id: string) => void
  rates: { THB: number; QAR: number }
}) {
  if (spends.length === 0) {
    return <div className="card p-4 text-sm text-gray-600">No spends yet. Add your first one.</div>
  }

  // group by date
  const groups = new Map<string, typeof spends>()
  for (const s of spends) {
    if (!groups.has(s.date)) groups.set(s.date, [])
    groups.get(s.date)!.push(s)
  }

  const dates = Array.from(groups.keys()).sort((a, b) => (a < b ? 1 : -1))

  return (
    <div className="space-y-3">
      {dates.map(d => (
        <div key={d} className="card p-3">
          <div className="text-xs font-medium text-gray-500 mb-2">
            {new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          <div className="divide-y divide-gray-100">
            {groups.get(d)!.map(s => (
              <SpendRow key={s.id} spend={s} onRemove={onRemove} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SpendRow({
  spend,
  onRemove,
}: {
  spend: {
    id: string
    date: string
    area: Area
    label: string
    currency: Currency
    amount: number
    notes?: string
  }
  onRemove: (id: string) => void
}) {
  const { state } = useContext(AppContext)
  const gbp = useMemo(() => convert(spend.amount, spend.currency, 'GBP', state.rates), [spend, state.rates])

  return (
    <div className="py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          className={
            'inline-flex h-8 w-8 items-center justify-center rounded-xl ' +
            (spend.area === 'Samui' ? 'bg-orange-50 text-orange-600' : 'bg-cyan-50 text-cyan-700')
          }
          title={spend.area}
        >
          {spend.area === 'Samui' ? 'S' : 'D'}
        </span>
        <div>
          <div className="text-sm font-medium text-gray-900">{spend.label}</div>
          <div className="text-xs text-gray-600">
            {spend.amount.toFixed(2)} {spend.currency}, about {formatGBP(gbp)}
            {spend.notes ? `, ${spend.notes}` : ''}
          </div>
        </div>
      </div>

      <button
        className="rounded-xl p-2 hover:bg-gray-100 text-gray-600"
        onClick={() => onRemove(spend.id)}
        aria-label="Delete spend"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
