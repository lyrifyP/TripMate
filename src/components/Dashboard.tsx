import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AppContext } from '../App'
import { betweenPercent, countdown, fmtDate } from '../lib/utils'
import { convert, fetchLiveRates } from '../lib/currency'
import type { Currency, WeatherData } from '../types'
import {
  PoundSterling,
  Eye,
  Utensils,
  ListChecks,
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudSun,
} from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="space-y-4">
      <Hero />
      <QuickActions />
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

function QuickActions() {
  const { setActiveTab } = useContext(AppContext)
  return (
    <div>
      <h3 className="section-title">Quick Actions</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button className="tile flex items-center gap-3" onClick={() => setActiveTab('budget')}>
          <span className="badge-icon bg-green-500/10 text-green-600"><PoundSterling size={18} /></span>
          <span className="text-base font-medium text-gray-900">Add Spend</span>
        </button>
        <button className="tile flex items-center gap-3" onClick={() => setActiveTab('planner')}>
          <span className="badge-icon bg-indigo-500/10 text-indigo-600"><Eye size={18} /></span>
          <span className="text-base font-medium text-gray-900">Today’s Plan</span>
        </button>
        <button className="tile flex items-center gap-3" onClick={() => setActiveTab('dining')}>
          <span className="badge-icon bg-orange-500/10 text-orange-600"><Utensils size={18} /></span>
          <span className="text-base font-medium text-gray-900">Dining</span>
        </button>
        <button className="tile flex items-center gap-3" onClick={() => setActiveTab('checklist')}>
          <span className="badge-icon bg-violet-500/10 text-violet-600"><ListChecks size={18} /></span>
          <span className="text-base font-medium text-gray-900">Checklist</span>
        </button>
      </div>
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
  const result = useMemo(
    () => convert(amount, from, to, state.rates),
    [amount, from, to, state.rates]
  )

  async function refreshRates() {
    try {
      setLoading(true)
      const live = await fetchLiveRates()
      setState(s => ({ ...s, rates: { ...s.rates, ...live, manualOverride: false } }))
    } catch (e: any) {
      alert('Could not fetch live rates, ' + (e?.message ?? 'unknown error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card-lg">
      <div className="flex items-center justify-between">
        <h3 className="section-title">Currency converter</h3>
        <div className="flex items-center gap-2">
          <button className="rounded-xl bg-gray-100 px-3 py-1 text-sm" onClick={refreshRates} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh live'}
          </button>
          <button
            className="rounded-xl bg-gray-100 px-3 py-1 text-sm"
            onClick={() =>
              setState(s => ({ ...s, rates: { ...s.rates, manualOverride: true, lastUpdatedISO: new Date().toISOString() } }))
            }
            title="Stop auto updates until you refresh"
          >
            Override rates
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <input
          className="card"
          type="number"
          value={amount}
          min={0}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <select className="card" value={from} onChange={(e) => setFrom(e.target.value as Currency)}>
          <option>GBP</option>
          <option>THB</option>
          <option>QAR</option>
        </select>
        <input className="card" value={result.toFixed(2)} readOnly />
        <select className="card" value={to} onChange={(e) => setTo(e.target.value as Currency)}>
          <option>GBP</option>
          <option>THB</option>
          <option>QAR</option>
        </select>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Last updated {state.rates.lastUpdatedISO ? new Date(state.rates.lastUpdatedISO).toLocaleString() : 'n/a'}
        {state.rates.manualOverride ? ', manual override is on' : ''}
      </p>
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
