import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AppContext } from '../App'
import { betweenPercent, countdown, fmtDate } from '../lib/utils'
import { convert, fetchLiveRates } from '../lib/currency'
import type { Currency, WeatherData } from '../types'
import {
  PoundSterling, Eye, Utensils, ListChecks,
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudSun,
  Plane, PlaneTakeoff, PlaneLanding, CalendarClock, ChevronRight, ArrowLeftRight,
  RefreshCw,
  Info
} from 'lucide-react'


export default function Dashboard() {
  return (
    <div className="space-y-4">
      <Hero />
      <CompactActions />       {/* replaces QuickActions */}
      <FlightsAtGlance />      {/* new */}
      <WeatherBlock />
      <CurrencyConverter />
      <Countdowns />
      <SyncBlock />
    </div>
  )
}


function Hero() {
  const { state } = useContext(AppContext)
  const pct = betweenPercent(state.startISO, state.endISO, new Date())
  return (
    <div className="hero">
      <h2 className="text-2xl font-extrabold">Welcome to Paradise!</h2>
      <p className="mt-1 text-white/90 text-sm">A trip to Koh Samui & Doha</p>
      <div className="mt-4">
        <div className="flex justify-between text-sm">
          <span>Trip Progress</span>
          <span>{pct}% complete</span>
        </div>
        <div className="mt-2 progress-track">
          <span className="progress-thumb" style={{ width: pct + '%' }}></span>
        </div>
        <p className="mt-1 text-xs text-white/90">
          {fmtDate(state.startISO)} to {fmtDate(state.endISO)}
        </p>
      </div>
    </div>
  )
}

function CompactActions() {
  const { setActiveTab } = useContext(AppContext)
  const btn = 'flex flex-col items-center gap-1 rounded-2xl bg-white shadow-sm border border-gray-100 py-2 active:scale-[0.98]'

  return (
    <div className="grid grid-cols-4 gap-2">
      <button className={btn} onClick={() => setActiveTab('budget')} aria-label="Add spend">
        <span className="badge-icon bg-green-500/10 text-green-600"><PoundSterling size={18} /></span>
        <span className="text-[11px] text-gray-800">Spend</span>
      </button>
      <button className={btn} onClick={() => setActiveTab('planner')} aria-label="Today plan">
        <span className="badge-icon bg-indigo-500/10 text-indigo-600"><Eye size={18} /></span>
        <span className="text-[11px] text-gray-800">Today</span>
      </button>
      <button className={btn} onClick={() => setActiveTab('dining')} aria-label="Dining">
        <span className="badge-icon bg-orange-500/10 text-orange-600"><Utensils size={18} /></span>
        <span className="text-[11px] text-gray-800">Dining</span>
      </button>
      <button className={btn} onClick={() => setActiveTab('checklist')} aria-label="Checklist">
        <span className="badge-icon bg-violet-500/10 text-violet-600"><ListChecks size={18} /></span>
        <span className="text-[11px] text-gray-800">Lists</span>
      </button>
    </div>
  )
}

function FlightsAtGlance() {
  const { state, setActiveTab } = useContext(AppContext)

  // choose flight like items from the plan
  const isFlightLike = (t: string) =>
    t.startsWith('Depart') || t.startsWith('Arrive') || t.startsWith('Check in') || t.startsWith('Transfer')

  const now = new Date()
  const withWhen = state.plan
    .filter(p => isFlightLike(p.title))
    .map(p => {
      const time = p.time ? p.time : '00:01'
      const at = new Date(`${p.date}T${time}`)
      return { ...p, at }
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime())

  const upcoming = withWhen.filter(p => p.at.getTime() >= now.getTime()).slice(0, 4)
  const next = upcoming[0]

  const iconFor = (title: string) => {
    if (title.startsWith('Depart')) return <PlaneTakeoff size={16} className="text-sky-600" />
    if (title.startsWith('Arrive')) return <PlaneLanding size={16} className="text-emerald-600" />
    return <Plane size={16} className="text-gray-600" />
  }

  return (
    <div className="card-lg">
      <div className="flex items-center justify-between">
        <h3 className="section-title flex items-center gap-2">
          <CalendarClock size={16} /> Flights at a glance
        </h3>
        <button className="rounded-xl bg-gray-100 px-3 py-1 text-sm" onClick={() => setActiveTab('planner')}>
          View plan
        </button>
      </div>

      {next && (
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">{iconFor(next.title)} Next up</span>
            <span className="opacity-90">
              {new Date(next.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
              {next.time ? `, ${next.time}` : ''}
            </span>
          </div>
          <div className="mt-1 text-base font-semibold">{next.title}</div>
        </div>
      )}

      {upcoming.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">No upcoming flights found</p>
      ) : (
        <div className="mt-3 space-y-2">
          {upcoming.map(p => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {iconFor(p.title)}
                <span className="truncate">{p.title}</span>
              </div>
              <div className="ml-2 text-gray-600 shrink-0">
                {new Date(p.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                {p.time ? `, ${p.time}` : ''}
              </div>
            </div>
          ))}
          <button
            className="mt-2 w-full rounded-xl bg-gray-50 border border-gray-200 py-2 text-sm flex items-center justify-center gap-2"
            onClick={() => setActiveTab('planner')}
          >
            Open full itinerary <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

function WeatherBlock() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // fetch forecast for a city, force the calendar to a specific time zone
  async function fetchForecast(lat: number, lon: number, tz = 'Europe/London') {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_min,temperature_2m_max,weathercode` +
      `&timezone=${encodeURIComponent(tz)}&forecast_days=5`

    const res = await fetch(url)
    if (!res.ok) throw new Error('Weather HTTP ' + res.status)
    const json = await res.json()

    return json.daily.time.map((date: string, i: number) => ({
      date,
      min: Math.round(json.daily.temperature_2m_min[i]),
      max: Math.round(json.daily.temperature_2m_max[i]),
      code: json.daily.weathercode[i] as number,
    })) as { date: string; min: number; max: number; code: number }[]
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const tz = 'Europe/London' // align both cities to your today
        const [samui, doha] = await Promise.all([
          fetchForecast(9.512, 100.013, tz),  // Koh Samui
          fetchForecast(25.285, 51.531, tz),  // Doha
        ])
        if (!cancelled) setData({ samui, doha })
      } catch {
        if (!cancelled) setError('Could not load weather, check your connection')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="card-lg">
      <h3 className="section-title">Weather Forecast</h3>
      {loading && <p className="mt-2 text-sm text-gray-600">Loading forecast…</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {data && !loading && !error && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <City name="Koh Samui" days={data.samui} />
          <City name="Doha" days={data.doha} />
        </div>
      )}
    </div>
  )
}

// Map Open-Meteo weather codes to Lucide icons
const weatherIcons: Record<number, JSX.Element> = {
  0: <Sun className="text-yellow-500" size={18} />,
  1: <Sun className="text-yellow-400" size={18} />,
  2: <CloudSun className="text-yellow-500" size={18} />,
  3: <Cloud className="text-gray-500" size={18} />,
  45: <CloudFog className="text-gray-400" size={18} />,
  48: <CloudFog className="text-gray-400" size={18} />,
  51: <CloudRain className="text-blue-400" size={18} />,
  53: <CloudRain className="text-blue-500" size={18} />,
  55: <CloudRain className="text-blue-600" size={18} />,
  61: <CloudRain className="text-blue-500" size={18} />,
  63: <CloudRain className="text-blue-600" size={18} />,
  65: <CloudRain className="text-blue-700" size={18} />,
  71: <CloudSnow className="text-blue-400" size={18} />,
  73: <CloudSnow className="text-blue-500" size={18} />,
  75: <CloudSnow className="text-blue-600" size={18} />,
  80: <CloudRain className="text-blue-600" size={18} />,
  81: <CloudRain className="text-blue-700" size={18} />,
  82: <CloudRain className="text-blue-800" size={18} />,
  95: <CloudLightning className="text-yellow-600" size={18} />,
  96: <CloudLightning className="text-yellow-700" size={18} />,
  99: <CloudLightning className="text-yellow-800" size={18} />,
}

function City({
  name,
  days,
}: {
  name: string
  days: { date: string; min: number; max: number; code: number }[]
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-3">
      <div className="text-sm font-medium mb-1">{name}</div>
      <div className="space-y-1 text-sm">
        {days.map((d) => (
          <div key={d.date} className="flex justify-between items-center gap-2">
            <span className="text-gray-600">
              {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
            </span>
            <span className="flex items-center gap-2 tabular-nums">
              {weatherIcons[d.code] ?? <Cloud size={18} className="text-gray-400" />}
              {d.min}° to {d.max}°
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CurrencyConverter() {
  const { state, setState } = useContext(AppContext)
  const [amount, setAmount] = useState(100)
  const [from, setFrom] = useState<Currency>('GBP')
  const [to, setTo] = useState<Currency>('THB')
  const [loading, setLoading] = useState(false)

  const result = useMemo(() => convert(amount, from, to, state.rates), [amount, from, to, state.rates])
  const oneFromTo = useMemo(() => convert(1, from, to, state.rates), [from, to, state.rates])
  const oneToFrom = useMemo(() => convert(1, to, from, state.rates), [from, to, state.rates])

  async function refreshRates() {
    try {
      setLoading(true)
      const live = await fetchLiveRates()
      setState(s => ({
        ...s,
        rates: { ...s.rates, ...live, manualOverride: false, lastUpdatedISO: new Date().toISOString() }
      }))
    } catch {
      alert('Could not fetch live rates')
    } finally {
      setLoading(false)
    }
  }

  function swap() {
    setFrom(to)
    setTo(from)
  }

  const segBtn = (active: boolean) =>
    'px-3 py-1.5 rounded-xl text-sm transition ' +
    (active ? 'bg-sky-100 text-sky-800 border border-sky-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')

  return (
    <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Currency converter</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshRates}
            className="rounded-xl bg-gray-100 px-3 py-1 text-sm text-gray-800 hover:bg-gray-200 disabled:opacity-60 inline-flex items-center gap-2"
            disabled={loading}
            title="Fetch live rates"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <button
            onClick={() =>
              setState(s => ({
                ...s,
                rates: { ...s.rates, manualOverride: !s.rates.manualOverride, lastUpdatedISO: new Date().toISOString() }
              }))
            }
            className={
              'rounded-full px-2.5 py-1 text-xs border ' +
              (state.rates.manualOverride
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-white text-gray-600 border-gray-200')
            }
            title="Toggle manual override"
          >
            {state.rates.manualOverride ? 'Override on' : 'Override off'}
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
        <div className="rounded-2xl bg-white text-gray-900 p-3 border border-gray-100">
          <label className="text-xs text-gray-600">From</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              className="w-full text-lg font-semibold outline-none"
              type="number"
              min={0}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
            />
            <select
              className="rounded-lg bg-gray-100 px-2 py-1 text-sm"
              value={from}
              onChange={e => setFrom(e.target.value as Currency)}
            >
              <option>GBP</option>
              <option>THB</option>
              <option>QAR</option>
            </select>
          </div>
        </div>

        <button
          className="self-center rounded-2xl bg-gray-100 p-2 hover:bg-gray-200 active:scale-95 text-gray-700"
          onClick={swap}
          title="Swap"
          aria-label="Swap"
        >
          <ArrowLeftRight size={18} />
        </button>

        <div className="rounded-2xl bg-white text-gray-900 p-3 border border-gray-100">
          <label className="text-xs text-gray-600">To</label>
          <div className="mt-1 flex items-center gap-2">
            <input className="w-full text-lg font-semibold outline-none" value={result.toFixed(2)} readOnly />
            <select
              className="rounded-lg bg-gray-100 px-2 py-1 text-sm"
              value={to}
              onChange={e => setTo(e.target.value as Currency)}
            >
              <option>GBP</option>
              <option>THB</option>
              <option>QAR</option>
            </select>
          </div>
        </div>
      </div>

      {/* One compact pill row, left picks source, right picks target */}
      <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {(['GBP', 'THB', 'QAR'] as Currency[]).map(c => (
            <button key={'from-' + c} onClick={() => setFrom(c)} className={segBtn(from === c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {(['GBP', 'THB', 'QAR'] as Currency[]).map(c => (
            <button key={'to-' + c} onClick={() => setTo(c)} className={segBtn(to === c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Subtle rate line */}
      <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700">
          <Info size={14} className="opacity-80" />
          <span>
            1 {from} = {oneFromTo.toFixed(4)} {to}, 1 {to} = {oneToFrom.toFixed(4)} {from}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {state.rates.lastUpdatedISO ? new Date(state.rates.lastUpdatedISO).toLocaleTimeString() : 'no update yet'}
        </span>
      </div>
    </div>
  )
}


function Countdowns() {
  const { state } = useContext(AppContext)
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="card-lg space-y-2">
      <h3 className="section-title">Countdowns</h3>
      {state.specialEvents.map(ev => (
        <CountdownRow key={ev.id} label={ev.label} atISO={ev.atISO} />
      ))}
    </div>
  )
}

function CountdownRow({ label, atISO }: { label: string; atISO: string }) {
  const c = countdown(atISO)
  const totalSpan = 60 * 60 * 24 * 60
  const used = Math.min(totalSpan, totalSpan - c.total)
  const pct = Math.max(0, Math.min(100, Math.round((used / totalSpan) * 100)))
  return (
    <div className="border border-gray-200 rounded-2xl p-3">
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="tabular-nums">
          {c.d}d {c.h}h {c.m}m {c.s}s
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
        <span className="block h-full bg-sky-500" style={{ width: pct + '%' }} />
      </div>
    </div>
  )
}

function SyncBlock() {
  const { state, setState } = useContext(AppContext)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  function resetAll() {
    if (!confirm('Reset all TripMate data on this device, this cannot be undone.')) return
    try {
      // If you know your storage key, prefer:
      // localStorage.removeItem('tripmate')
      localStorage.clear()
      location.reload()
    } catch {
      alert('Reset failed')
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Sync</h3>
          <p className="text-sm text-gray-600">Share or paste trip data between two devices</p>
        </div>
        <button className="rounded-xl bg-gray-100 px-3 py-1" onClick={() => setOpen(v => !v)}>
          {open ? 'Close' : 'Open'}
        </button>
      </div>

      {open && (
        <div className="mt-3 border border-gray-200 rounded-2xl p-3 space-y-2">
          <button
            className="tile w-full"
            onClick={() => navigator.clipboard.writeText(JSON.stringify(state))}
          >
            Copy data
          </button>

          <button
            className="tile w-full bg-red-50 text-red-700 hover:bg-red-100"
            onClick={resetAll}
          >
            Reset all data
          </button>

          <textarea
            className="w-full h-32 card"
            placeholder="Paste data here"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button
            className="tile w-full"
            onClick={() => {
              try {
                const parsed = JSON.parse(text)
                setState(parsed)
                setOpen(false)
              } catch {
                alert('Invalid JSON')
              }
            }}
          >
            Replace with pasted
          </button>

          <p className="text-xs text-gray-500">
            Tip, Reset clears local storage for this site and reloads the app with defaults.
          </p>
        </div>
      )}
    </div>
  )
}
