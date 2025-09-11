import React, { useContext, useEffect, useMemo, useState } from 'react'
import { AppContext } from '../App'
import { betweenPercent, countdown, fmtDate } from '../lib/utils'
import { convert, fetchLiveRates } from '../lib/currency'
import type { Currency, WeatherData } from '../types'
import NewsCard from './NewsCard'
import { fetchFlightStatus, LiveFlightStatus } from '../lib/flight'
import { pctComplete} from '../lib/utils'
import {
  CalendarClock, Plane, PlaneTakeoff, PlaneLanding,
  Sun, SunMedium, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudSun,
  RefreshCw, ArrowLeftRight, Shield, Info,
  Luggage, Droplets,
} from 'lucide-react'


/* =========================================================
   Dashboard (home)
   ========================================================= */
export default function Dashboard() {
  return (
    <div className="space-y-4">
      <Hero />

      <CollapsibleCard title="Concierge" storageKey="home.concierge">
  <ConciergeCard />
</CollapsibleCard>


      <CollapsibleCard title="Travel news" storageKey="home.news" defaultOpen>
  <NewsCard
    query='(Doha OR Qatar) OR ("Koh Samui" OR Thailand)'
    limit={6}
    autoRefreshMin={15}
  />
</CollapsibleCard>

<CollapsibleCard title="Local time" storageKey="home.time" defaultOpen>
  <WorldClocks />
</CollapsibleCard>

      <CollapsibleCard title="Events at a glance" storageKey="home.flights" defaultOpen>
        <FlightsAtGlance />
      </CollapsibleCard>

      <CollapsibleCard title="Weather forecast" storageKey="home.weather" defaultOpen>
        <WeatherBlock />
      </CollapsibleCard>

      <CollapsibleCard title="Currency" storageKey="home.currency" defaultOpen>
        <CurrencyConverter />
      </CollapsibleCard>

      <CollapsibleCard title="Countdowns" storageKey="home.countdowns">
        <Countdowns />
      </CollapsibleCard>

      <CollapsibleCard title="Steps this week" storageKey="home.steps">
        <StepsBlock />
      </CollapsibleCard>

      <CollapsibleCard title="Holiday essentials" storageKey="home.essentials">
        <HolidayEssentials />
      </CollapsibleCard>

      <CollapsibleCard title="Sync" storageKey="home.sync">
        <SyncBlock />
      </CollapsibleCard>
    </div>
  )
}

/* =========================================================
   Collapsible section wrapper (persists open state)
   ========================================================= */
function CollapsibleCard({
  title,
  children,
  storageKey,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  storageKey: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(`tripmate.card.${storageKey}`)
      return raw == null ? defaultOpen : JSON.parse(raw)
    } catch {
      return defaultOpen
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(`tripmate.card.${storageKey}`, JSON.stringify(open))
    } catch { /* ignore */ }
  }, [open, storageKey])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="section-title">{title}</h3>
        <button
          onClick={() => setOpen(v => !v)}
          className="rounded-xl bg-gray-100 px-3 py-1 text-sm"
          aria-expanded={open}
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

/* =========================================================
   Hero
   ========================================================= */
function Hero() {
  const { state } = useContext(AppContext)
  const pct = betweenPercent(state.startISO, state.endISO, new Date())
  return (
    <div className="hero">
      <h2 className="text-2xl font-extrabold">Welcome to your personalised travel hub</h2>
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


/* =========================================================
   Flights at a glance (+ “flights only” modal)
   ========================================================= */
   function FlightsAtGlance() {
    const { state, setActiveTab } = useContext(AppContext)
  
    // flights sheet
    const [open, setOpen] = useState(false)
  
    // lock body scroll when flights sheet open
    useEffect(() => {
      if (!open) return
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }, [open])
  
    // live flight status modal state
    const [liveOpen, setLiveOpen] = useState(false)
    const [liveLoading, setLiveLoading] = useState(false)
    const [liveError, setLiveError] = useState<string | null>(null)
    const [liveData, setLiveData] = useState<LiveFlightStatus | null>(null)
    const [liveTitle, setLiveTitle] = useState<string>('') // e.g. QR24
  
    // helper, detect a flight number in a title
    const hasFlightNum = (title: string) => /\b[A-Z]{2}\s?\d{2,4}\b/.test(title)
  
    // open live status modal, parse flight number from title
    async function openLive(title: string, dateISO?: string) {
      const match = title.match(/\b[A-Z]{2}\s?\d{2,4}\b/)
      const flightNum = match ? match[0].replace(/\s+/g, '') : ''
      setLiveTitle(flightNum || '—')
      setLiveOpen(true)
      setLiveError(null)
      setLiveData(null)
  
      if (!flightNum) {
        setLiveError('No flight number found in this item')
        return
      }
  
      try {
        setLiveLoading(true)
        const data = await fetchFlightStatus(flightNum, dateISO)
        setLiveData(data)
      } catch (e: any) {
        setLiveError(e?.message || 'Could not fetch flight status')
      } finally {
        setLiveLoading(false)
      }
    }
  
    // choose flight-like items from the plan
    const isFlightLike = (t: string) =>
      t.startsWith('Depart') || t.startsWith('Arrive') || t.startsWith('Check in') || t.startsWith('Transfer')
  
    const withWhen = state.plan
      .filter(p => p?.title && isFlightLike(p.title))
      .map(p => {
        const time = p.time ? p.time : '00:01'
        const at = new Date(`${p.date}T${time}`)
        return { ...p, at }
      })
      .filter(p => !isNaN(p.at.getTime()))
      .sort((a, b) => a.at.getTime() - b.at.getTime())
  
    const now = Date.now()
    const upcoming = withWhen.filter(p => p.at.getTime() >= now).slice(0, 4)
    const next = upcoming[0]
  
    const iconFor = (title: string) => {
      if (title.startsWith('Depart')) return <PlaneTakeoff size={16} className="text-sky-600" />
      if (title.startsWith('Arrive')) return <PlaneLanding size={16} className="text-emerald-600" />
      return <Plane size={16} className="text-gray-600" />
    }
  
    return (
      <>
        {/* header actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <CalendarClock size={16} /> <span className="font-medium">Flights at a glance</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
              onClick={() => setActiveTab('planner')}
              title="Open full plan"
            >
              Plan
            </button>
            <button
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
              onClick={() => setOpen(true)}
              title="Flights and transfers"
              aria-haspopup="dialog"
              aria-expanded={open}
            >
              <Plane className="w-4 h-4" />
              <span className="hidden sm:inline">Flights</span>
            </button>
          </div>
        </div>
  
        {next && (
          <div className="mt-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 text-white p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">{iconFor(next.title)} Next up</span>
              <span className="opacity-90">
                {new Date(next.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
                {next.time ? `, ${next.time}` : ''}
              </span>
            </div>
            <div className="mt-1 text-base font-semibold flex items-center justify-between gap-2">
              <span className="truncate">{next.title}</span>
              {hasFlightNum(next.title) && (
                <button
                  className="px-2 py-0.5 rounded-lg bg-white/15 text-white text-xs hover:bg-white/25"
                  onClick={() => openLive(next.title, next.date)}
                  title="Live status"
                >
                  Live
                </button>
              )}
            </div>
          </div>
        )}
  
        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No upcoming flights found</p>
        ) : (
          <div className="mt-3 space-y-2">
            {upcoming.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {iconFor(p.title)}
                  <span className="truncate">{p.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasFlightNum(p.title) && (
                    <button
                      className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200"
                      title="Live status"
                      onClick={() => openLive(p.title, p.date)}
                    >
                      Live
                    </button>
                  )}
                  <div className="text-gray-600">
                    {new Date(p.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {p.time ? `, ${p.time}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
  
        {/* flights only modal */}
        {open && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div
              role="dialog"
              aria-modal="true"
              className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px]
                         bg-white rounded-t-2xl sm:rounded-l-2xl shadow-xl p-4
                         max-h-[80vh] sm:max-h-screen overflow-y-auto overscroll-contain"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between sticky top-0 bg-white pb-2">
                <h3 className="text-base font-semibold">Flights and transfers</h3>
                <button
                  className="rounded-xl bg-gray-100 px-3 py-1 text-sm"
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
  
              <div className="mt-3 space-y-3">
                {groupByDate(withWhen).map(g => (
                  <div key={g.date} className="rounded-2xl border border-gray-200 p-3">
                    <div className="text-sm font-medium mb-2">
                      {new Date(g.date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="space-y-2">
                      {g.items.map(it => (
                        <div key={it.id} className="flex items-center justify-between text-sm gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {iconFor(it.title)}
                            <span className="truncate">{it.title}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {hasFlightNum(it.title) && (
                              <button
                                className="px-2 py-0.5 rounded-lg bg-gray-100 hover:bg-gray-200"
                                title="Live status"
                                onClick={() => openLive(it.title, it.date)}
                              >
                                Live
                              </button>
                            )}
                            <div className="text-gray-600">{it.time || '—'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
  
        {/* live status modal */}
        {liveOpen && (
          <div className="fixed inset-0 z-50" onClick={() => setLiveOpen(false)}>
            <div className="absolute inset-0 bg-black/40" />
            <div
              className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px]
                         bg-white rounded-t-2xl sm:rounded-l-2xl shadow-xl p-4
                         max-h-[80vh] sm:max-h-screen overflow-y-auto"
              onClick={e => e.stopPropagation()}
              role="dialog" aria-modal="true"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Live flight status {liveTitle ? `• ${liveTitle}` : ''}</h3>
                <button className="rounded-xl bg-gray-100 px-3 py-1 text-sm" onClick={() => setLiveOpen(false)}>
                  Close
                </button>
              </div>
  
              {liveLoading && <p className="mt-3 text-sm text-gray-600">Fetching latest status…</p>}
              {liveError && <p className="mt-3 text-sm text-red-600">{liveError}</p>}
  
              {liveData && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-gray-200 p-3">
                    <div className="text-sm font-medium">
                      {liveData.flight.airline ?? 'Airline'} — {liveData.flight.iata ?? liveData.flight.icao ?? '—'}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Status: <span className="font-medium">{liveData.flight.status ?? 'unknown'}</span>
                    </div>
                  </div>
  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-gray-200 p-3">
                      <div className="text-xs text-gray-500">Departure</div>
                      <div className="text-sm font-medium">{liveData.departure.airport ?? '—'}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {liveData.departure.iata ?? ''} {liveData.departure.terminal ? `T${liveData.departure.terminal}` : ''} {liveData.departure.gate ? `• Gate ${liveData.departure.gate}` : ''}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Sched: {liveData.departure.scheduled ? new Date(liveData.departure.scheduled).toLocaleString() : '—'}
                      </div>
                      <div className="text-xs text-gray-600">
                        Est: {liveData.departure.estimated ? new Date(liveData.departure.estimated).toLocaleString() : '—'}
                      </div>
                    </div>
  
                    <div className="rounded-2xl border border-gray-200 p-3">
                      <div className="text-xs text-gray-500">Arrival</div>
                      <div className="text-sm font-medium">{liveData.arrival.airport ?? '—'}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {liveData.arrival.iata ?? ''} {liveData.arrival.terminal ? `T${liveData.arrival.terminal}` : ''} {liveData.arrival.gate ? `• Gate ${liveData.arrival.gate}` : ''}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Sched: {liveData.arrival.scheduled ? new Date(liveData.arrival.scheduled).toLocaleString() : '—'}
                      </div>
                      <div className="text-xs text-gray-600">
                        Est: {liveData.arrival.estimated ? new Date(liveData.arrival.estimated).toLocaleString() : '—'}
                      </div>
                      {liveData.arrival.baggage && (
                        <div className="text-xs text-gray-600 mt-1">Baggage: {liveData.arrival.baggage}</div>
                      )}
                    </div>
                  </div>
  
                  <div className="rounded-2xl border border-gray-200 p-3">
                    <div className="text-sm font-medium mb-1">In flight progress</div>
                    {(() => {
                      const start = liveData.departure.actual || liveData.departure.estimated || liveData.departure.scheduled
                      const end   = liveData.arrival.estimated || liveData.arrival.scheduled || liveData.arrival.actual
                      const pct   = pctComplete(start, end)
                      return (
                        <>
                          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                            <span className="block h-full bg-sky-500" style={{ width: pct + '%' }} />
                          </div>
                          <div className="mt-1 text-xs text-gray-600">{pct}% complete</div>
                        </>
                      )
                    })()}
                  </div>
  
                  <div className="text-xs text-gray-600">
                    Open full tracker:{' '}
                    {liveTitle ? (
                      <>
                        <a
                          className="underline"
                          href={`https://www.flightradar24.com/${encodeURIComponent(liveTitle)}`}
                          target="_blank" rel="noreferrer"
                        >FlightRadar24</a>
                        {' · '}
                        <a
                          className="underline"
                          href={`https://flightaware.com/live/flight/${encodeURIComponent(liveTitle)}`}
                          target="_blank" rel="noreferrer"
                        >FlightAware</a>
                      </>
                    ) : '—'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    )
  }
  
  
  
  
function groupByDate<T extends { date: string }>(items: T[]) {
  const map = new Map<string, T[]>()
  items.forEach(i => {
    const list = map.get(i.date) ?? []
    list.push(i)
    map.set(i.date, list)
  })
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, items]) => ({ date, items }))
}

/* =========================================================
   Local Time – UK / Doha / Koh Samui
   ========================================================= */
   function WorldClocks() {
    // tick every second
    const [, setTick] = React.useState(0)
    React.useEffect(() => {
      const id = setInterval(() => setTick(t => t + 1), 1000)
      return () => clearInterval(id)
    }, [])
  
    const zones: { city: string; tz: string }[] = [
      { city: 'UK (London)', tz: 'Europe/London' },
      { city: 'Doha', tz: 'Asia/Qatar' },
      { city: 'Koh Samui', tz: 'Asia/Bangkok' },
    ]
  
    return (
      <div className="grid grid-cols-3 gap-3 max-[400px]:grid-cols-1 sm:grid-cols-3">
        {zones.map(z => (
          <ClockCard key={z.tz} city={z.city} tz={z.tz} />
        ))}
      </div>
    )
  }
  
  function ClockCard({ city, tz }: { city: string; tz: string }) {
    const { h, m, s, dateStr, timeStr } = getZonedParts(tz)
    return (
      <div className="rounded-2xl border border-gray-200 p-3 flex items-center gap-3">
        <AnalogClock h={h} m={m} s={s} />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{city}</div>
          <div className="text-lg font-semibold tabular-nums leading-tight">{timeStr}</div>
          <div className="text-xs text-gray-500">{dateStr}</div>
        </div>
      </div>
    )
  }
  
  /** Read h/m/s + formatted date/time for a specific IANA timezone. */
  function getZonedParts(tz: string) {
    const now = new Date()
    // numeric parts
    const parts = Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(now)
    const h = Number(parts.find(p => p.type === 'hour')?.value ?? '0')
    const m = Number(parts.find(p => p.type === 'minute')?.value ?? '0')
    const s = Number(parts.find(p => p.type === 'second')?.value ?? '0')
  
    const dateStr = Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(now)
  
    const timeStr = Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now)
  
    return { h, m, s, dateStr, timeStr }
  }
  
  /** Tiny analog clock (SVG), minimal + crisp. */
  function AnalogClock({ h, m, s }: { h: number; m: number; s: number }) {
    const size = 56
    const r = 26
    // angles
    const hourAngle = ((h % 12) + m / 60) * 30 // deg
    const minAngle = (m + s / 60) * 6
    const secAngle = s * 6
  
    return (
      <svg viewBox="0 0 64 64" width={size} height={size} className="shrink-0">
        {/* dial */}
        <circle cx="32" cy="32" r={r + 2} fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
        {/* tick marks (12) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180
          const x1 = 32 + Math.sin(angle) * (r - 2)
          const y1 = 32 - Math.cos(angle) * (r - 2)
          const x2 = 32 + Math.sin(angle) * r
          const y2 = 32 - Math.cos(angle) * r
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#9ca3af" strokeWidth={i % 3 === 0 ? 2 : 1} />
        })}
        {/* hour hand */}
        <line
          x1="32" y1="32"
          x2={polarX(32, 32, r * 0.5, hourAngle)}
          y2={polarY(32, 32, r * 0.5, hourAngle)}
          stroke="#111827" strokeWidth="3" strokeLinecap="round"
        />
        {/* minute hand */}
        <line
          x1="32" y1="32"
          x2={polarX(32, 32, r * 0.75, minAngle)}
          y2={polarY(32, 32, r * 0.75, minAngle)}
          stroke="#1f2937" strokeWidth="2" strokeLinecap="round"
        />
        {/* second hand */}
        <line
          x1="32" y1="34"
          x2={polarX(32, 32, r * 0.8, secAngle)}
          y2={polarY(32, 32, r * 0.8, secAngle)}
          stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="2" fill="#111827" />
      </svg>
    )
  }
  
  function polarX(cx: number, cy: number, radius: number, angleDeg: number) {
    const a = (angleDeg * Math.PI) / 180
    return cx + Math.sin(a) * radius
  }
  function polarY(cx: number, cy: number, radius: number, angleDeg: number) {
    const a = (angleDeg * Math.PI) / 180
    return cy - Math.cos(a) * radius
  }

// City meta for hourly fetching (local timezones)
const CITY_META = {
  'Koh Samui': { lat: 9.512,  lon: 100.013, tz: 'Asia/Bangkok' },
  'Doha':      { lat: 25.285, lon: 51.531,  tz: 'Asia/Qatar'   },
} as const

type CityName = keyof typeof CITY_META

function isoTodayInTZ(tz: string) {
  // Get YYYY-MM-DD for "today" in the target timezone
  const now = new Date()
  // format to that tz via toLocaleString and then rebuild a Date
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now)
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const d = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}

async function fetchHourlyForToday(city: CityName) {
  const { lat, lon, tz } = CITY_META[city]
  const day = isoTodayInTZ(tz)
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,precipitation_probability,wind_speed_10m,relative_humidity_2m,weathercode` +
    `&timezone=${encodeURIComponent(tz)}` +
    `&start_date=${day}&end_date=${day}`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Hourly HTTP ' + res.status)
  const j = await res.json()

  // Build an array of { timeLocal, hourLabel, temp, pop, wind, rh, code }
  const times: string[] = j.hourly.time ?? []
  const out = times.map((iso: string, i: number) => {
    const dt = new Date(iso) // already localized by API timezone param
    const hourLabel = dt.toLocaleTimeString(undefined, { hour: '2-digit', hour12: false })
    return {
      iso,
      hourLabel,
      temp: Math.round(j.hourly.temperature_2m?.[i] ?? 0),
      pop: j.hourly.precipitation_probability?.[i] ?? 0,
      wind: Math.round(j.hourly.wind_speed_10m?.[i] ?? 0),
      rh: j.hourly.relative_humidity_2m?.[i] ?? 0,
      code: j.hourly.weathercode?.[i] ?? 0,
    }
  })
  return { tz, day, rows: out }
}

function CityDetailModal({
  city,
  onClose,
}: {
  city: CityName
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<{
    tz: string
    day: string
    rows: Array<{ iso:string; hourLabel:string; temp:number; pop:number; wind:number; rh:number; code:number }>
  } | null>(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      try {
        setLoading(true)
        const got = await fetchHourlyForToday(city)
        if (!cancel) setData(got)
      } catch {
        if (!cancel) setError('Could not load hourly weather')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [city])

  // lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog" aria-modal="true"
        className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[460px]
                   bg-white rounded-t-2xl sm:rounded-l-2xl shadow-xl p-4
                   max-h-[80vh] sm:max-h-screen overflow-y-auto overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between sticky top-0 bg-white pb-2">
          <div>
            <div className="text-base font-semibold">{city} — today</div>
            <div className="text-xs text-gray-600">
              {data?.day} · {data?.tz}
            </div>
          </div>
          <button className="rounded-xl bg-gray-100 px-3 py-1 text-sm" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <p className="mt-3 text-sm text-gray-600">Loading hourly…</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {data && !loading && !error && (
          <div className="mt-3 space-y-4">
            {/* A simple horizontally-scrollable row of hour blocks */}
            <div className="rounded-2xl border border-gray-200 p-2">
              <div className="text-sm font-medium mb-1">Temperature (°C)</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.rows.map(r => (
                  <div key={r.iso} className="min-w-[64px] py-2 px-2 rounded-xl bg-gray-50 text-center">
                    <div className="text-[11px] text-gray-600">{r.hourLabel}</div>
                    <div className="text-base font-semibold">{r.temp}°</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 p-2">
                <div className="text-sm font-medium mb-1">Rain chance (%)</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {data.rows.map(r => (
                    <div key={'p'+r.iso} className="min-w-[64px] py-2 px-2 rounded-xl bg-gray-50 text-center">
                      <div className="text-[11px] text-gray-600">{r.hourLabel}</div>
                      <div className="text-base font-semibold">{r.pop}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-2">
                <div className="text-sm font-medium mb-1">Wind (km/h)</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {data.rows.map(r => (
                    <div key={'w'+r.iso} className="min-w-[64px] py-2 px-2 rounded-xl bg-gray-50 text-center">
                      <div className="text-[11px] text-gray-600">{r.hourLabel}</div>
                      <div className="text-base font-semibold">{r.wind}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-2 sm:col-span-2">
                <div className="text-sm font-medium mb-1">Humidity (%)</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {data.rows.map(r => (
                    <div key={'h'+r.iso} className="min-w-[64px] py-2 px-2 rounded-xl bg-gray-50 text-center">
                      <div className="text-[11px] text-gray-600">{r.hourLabel}</div>
                      <div className="text-base font-semibold">{r.rh}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Times shown in local time · tap Close to return.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


/* =========================================================
   Weather
   ========================================================= */
function WeatherBlock() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<CityName | null>(null)

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
        const tz = 'Europe/London' // align both cities to your "today"
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
    <>
      {loading && <p className="text-sm text-gray-600">Loading forecast…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {data && !loading && !error && (
        <div className="grid grid-cols-2 gap-3 max-[360px]:grid-cols-1">
          <City name="Koh Samui" days={data.samui} onOpenDetail={c => setDetail(c)} />
          <City name="Doha" days={data.doha} onOpenDetail={c => setDetail(c)} />
        </div>
      )}
  
      {detail && (
        <CityDetailModal city={detail} onClose={() => setDetail(null)} />
      )}
    </>

    )
}

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
  onOpenDetail,
}: {
  name: CityName
  days: { date: string; min: number; max: number; code: number }[]
  onOpenDetail?: (c: CityName) => void
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-medium">{name}</div>
        <button
          className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
          onClick={() => onOpenDetail?.(name)}
        >
          Details
        </button>
      </div>
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


/* =========================================================
   Currency (compact, refreshed, centered chips)
   ========================================================= */
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
    <>
      {/* toolbar */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Converter</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshRates}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-60"
            disabled={loading}
            aria-label="Refresh rates"
            title="Refresh rates"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() =>
              setState(s => ({
                ...s,
                rates: { ...s.rates, manualOverride: !s.rates.manualOverride, lastUpdatedISO: new Date().toISOString() }
              }))
            }
            className={
              'px-2.5 py-1 rounded-full text-xs border inline-flex items-center gap-1 ' +
              (state.rates.manualOverride
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-white text-gray-600 border-gray-200')
            }
            title="Toggle manual override"
          >
            <Shield size={12} />
            {state.rates.manualOverride ? 'Override on' : 'Override off'}
          </button>
        </div>
      </div>

      {/* inputs */}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
        <div className="rounded-2xl bg-white text-gray-900 p-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">From</label>
            <select
              className="w-[72px] sm:w-[84px] rounded-lg bg-gray-100 px-2 py-1 text-sm text-gray-800"
              value={from}
              onChange={e => setFrom(e.target.value as Currency)}
            >
              <option>GBP</option><option>THB</option><option>QAR</option>
            </select>
          </div>
          <input
            className="mt-1 w-full tabular-nums text-right font-semibold text-[clamp(18px,5vw,26px)] outline-none"
            type="number"
            inputMode="decimal"
            min={0}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
          />
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
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">To</label>
            <select
              className="w-[72px] sm:w-[84px] rounded-lg bg-gray-100 px-2 py-1 text-sm text-gray-800"
              value={to}
              onChange={e => setTo(e.target.value as Currency)}
            >
              <option>GBP</option><option>THB</option><option>QAR</option>
            </select>
          </div>
          <input
            className="mt-1 w-full tabular-nums text-right font-semibold text-[clamp(18px,5vw,26px)] outline-none"
            value={result.toFixed(2)}
            readOnly
          />
        </div>
      </div>

      {/* centered chips */}
      <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
        <div className="flex items-center justify-center gap-2">
          {(['GBP','THB','QAR'] as Currency[]).map(c => (
            <button key={'from-'+c} onClick={() => setFrom(c)} className={segBtn(from === c)}>{c}</button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2">
          {(['GBP','THB','QAR'] as Currency[]).map(c => (
            <button key={'to-'+c} onClick={() => setTo(c)} className={segBtn(to === c)}>{c}</button>
          ))}
        </div>
      </div>

      {/* subtle rate line */}
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Info size={12} className="opacity-60" />
          <span>
            1 {from} = {oneFromTo.toFixed(4)} {to}, 1 {to} = {oneToFrom.toFixed(4)} {from}
          </span>
        </div>
        <span>
          {state.rates.lastUpdatedISO
            ? new Date(state.rates.lastUpdatedISO).toLocaleTimeString()
            : 'no update yet'}
        </span>
      </div>
    </>
  )
}

/* =========================================================
   Countdowns
   ========================================================= */
function Countdowns() {
  const { state } = useContext(AppContext)
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="space-y-2">
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

/* =========================================================
   Holiday Essentials (local, lightweight store)
   ========================================================= */
function HolidayEssentials() {
  const STORAGE_KEY = 'tripmate.essentials.v1'
  type Bucket = 'Essentials' | 'Samui' | 'Doha'
  type Item = { id: string; label: string; bucket: Bucket; done: boolean }

  const defaults: Item[] = [
    // Essentials
    { id: 'passport', label: 'Passport and copies', bucket: 'Essentials', done: false },
    { id: 'insurance', label: 'Travel insurance details', bucket: 'Essentials', done: false },
    { id: 'cards', label: 'Bank cards and travel card', bucket: 'Essentials', done: false },
    { id: 'meds', label: 'Medication and basic first aid', bucket: 'Essentials', done: false },
    { id: 'adapters', label: 'Plug adapters and chargers', bucket: 'Essentials', done: false },
    { id: 'sun', label: 'Sunscreen and after sun', bucket: 'Essentials', done: false },

    // Samui
    { id: 'samui-swim', label: 'Swimwear and cover ups', bucket: 'Samui', done: false },
    { id: 'samui-repel', label: 'Mosquito repellent', bucket: 'Samui', done: false },
    { id: 'samui-water', label: 'Reusable water bottle', bucket: 'Samui', done: false },
    { id: 'samui-cash', label: 'Some cash for markets', bucket: 'Samui', done: false },

    // Doha
    { id: 'doha-light', label: 'Light modest outfits for malls and museums', bucket: 'Doha', done: false },
    { id: 'doha-scarf', label: 'Scarf or light shawl', bucket: 'Doha', done: false },
    { id: 'doha-sun', label: 'Cap or sun hat', bucket: 'Doha', done: false },
    { id: 'doha-ride', label: 'Ride hailing app set up', bucket: 'Doha', done: false },
  ]

  function load(): Item[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return defaults
      const parsed = JSON.parse(raw) as Item[]
      const existing = new Map(parsed.map(i => [i.id, i]))
      for (const d of defaults) if (!existing.has(d.id)) existing.set(d.id, d)
      return Array.from(existing.values())
    } catch {
      return defaults
    }
  }
  function save(items: Item[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }

  const [bucket, setBucket] = React.useState<Bucket | 'All'>('All')
  const [items, setItems] = React.useState<Item[]>(() => load())

  function setAndSave(updater: (prev: Item[]) => Item[]) {
    setItems(prev => {
      const next = updater(prev)
      save(next)
      return next
    })
  }

  const filtered = items.filter(i => (bucket === 'All' ? true : i.bucket === bucket))
  const doneCount = items.filter(i => i.done).length

  function toggle(id: string) {
    setAndSave(prev => prev.map(i => (i.id === id ? { ...i, done: !i.done } : i)))
  }

  function resetAll() {
    if (!confirm('Untick all essentials')) return
    setAndSave(prev => prev.map(i => ({ ...i, done: false })))
  }

  const bucketChip = (val: Bucket | 'All', label: string) => (
    <button
      key={val}
      className={'px-3 py-1 rounded-lg text-sm ' + (bucket === val ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800')}
      onClick={() => setBucket(val)}
    >
      {label}
    </button>
  )

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Luggage size={16} /> <span className="font-medium">Holiday essentials</span>
        </div>
        <button
          className="rounded-xl bg-gray-100 px-3 py-1 text-sm disabled:opacity-40"
          onClick={resetAll}
          disabled={doneCount === 0}
          title={doneCount ? `Untick ${doneCount} completed` : 'Nothing completed yet'}
        >
          Reset
        </button>
      </div>

      {/* legend */}
      <div className="mt-2 text-xs text-gray-500 flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <Shield size={14} /> Essentials
        </span>
        <span className="inline-flex items-center gap-1">
          <SunMedium size={14} /> Samui
        </span>
        <span className="inline-flex items-center gap-1">
          <Droplets size={14} /> Doha
        </span>
      </div>

      {/* filters */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {bucketChip('All', 'All')}
        {bucketChip('Essentials', 'Essentials')}
        {bucketChip('Samui', 'Samui')}
        {bucketChip('Doha', 'Doha')}
      </div>

      {/* list */}
      <div className="mt-3 space-y-2">
        {filtered.map(i => (
          <label key={i.id} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 p-2">
            <div className="flex items-center gap-3 min-w-0">
              <input
                type="checkbox"
                checked={i.done}
                onChange={() => toggle(i.id)}
                className="h-5 w-5 rounded border-gray-300"
              />
              <span className={'text-sm truncate ' + (i.done ? 'line-through text-gray-500' : 'text-gray-900')}>
                {i.label}
              </span>
            </div>
            <span className="text-[11px] text-gray-500 shrink-0 px-2 py-0.5 rounded-full bg-gray-50">
              {i.bucket}
            </span>
          </label>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 p-3 text-sm text-gray-600">
            Nothing here for this bucket
          </div>
        )}
      </div>
    </>
  )
}

/* =========================================================
   Steps (weekly chart + today entry + trip totals)
   ========================================================= */
function StepsBlock() {
  const { state, setState } = useContext(AppContext)
  const [input, setInput] = useState('')
  // average adult stride (m/step), tweakable
  const [strideM, setStrideM] = useState(0.78)

  const today = new Date().toISOString().slice(0, 10) // yyyy-mm-dd
  const todaySteps = (state as any).steps?.[today] ?? 0

  // last 7 days (oldest -> newest)
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    return {
      key,
      label: d.toLocaleDateString(undefined, { weekday: 'short' }),
      value: (state as any).steps?.[key] ?? 0,
    }
  })

  // keep scale sensible up to 25k so tall days don’t clip
  const max = Math.max(25000, ...days.map(d => d.value))
  const W = 280
  const H = 120
  const barW = W / days.length
  const pad = 8

  function saveSteps() {
    const n = parseInt(input, 10)
    if (!isNaN(n) && n >= 0) {
      setState((s: any) => ({
        ...s,
        steps: { ...(s.steps ?? {}), [today]: n },
      }))
      setInput('')
    }
  }

  // Running total across the holiday window
  const start = new Date((state as any).startISO)
  const end = new Date((state as any).endISO)
  end.setHours(23, 59, 59, 999)

  let totalStepsTrip = 0
  if ((state as any).steps) {
    for (const [k, v] of Object.entries((state as any).steps)) {
      const d = new Date(k)
      if (d >= start && d <= end) totalStepsTrip += v as number
    }
  }

  const km = (totalStepsTrip * strideM) / 1000
  const miles = km * 0.621371

  return (
    <>
      {/* chart */}
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[140px]">
          <defs>
            <pattern id="sgrid" width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect x="0" y="0" width={W} height={H} fill="url(#sgrid)" />
          {days.map((d, i) => {
            const h = Math.max(2, Math.round((d.value / max) * (H - 28)))
            const x = i * barW + pad
            const y = H - 20 - h
            const active = i === days.length - 1
            return (
              <g key={d.key}>
                <rect
                  x={x} y={y}
                  width={barW - pad * 2}
                  height={h}
                  rx="6"
                  className={active ? 'fill-emerald-500' : 'fill-sky-500'}
                  opacity={active ? 1 : 0.9}
                />
                {h > 18 && (
                  <text
                    x={x + (barW - pad * 2) / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#374151"
                  >
                    {d.value.toLocaleString()}
                  </text>
                )}
                <text
                  x={x + (barW - pad * 2) / 2}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6B7280"
                >
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* today input */}
      <div className="mt-3 flex gap-2 items-center">
        <input
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={`Today’s steps (${todaySteps.toLocaleString()} logged)`}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="tile" onClick={saveSteps}>Save</button>
      </div>

      {/* trip totals */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-2 text-center">
          <div className="text-xs text-gray-500">Trip steps</div>
          <div className="font-semibold">{totalStepsTrip.toLocaleString()}</div>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-2 text-center">
          <div className="text-xs text-gray-500">Approx km</div>
          <div className="font-semibold">{km.toFixed(1)}</div>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-2 text-center">
          <div className="text-xs text-gray-500">Approx miles</div>
          <div className="font-semibold">{miles.toFixed(1)}</div>
        </div>
      </div>

      {/* stride control */}
      <div className="mt-2 flex items-center justify-end gap-2 text-xs text-gray-500">
        <label htmlFor="stride" className="whitespace-nowrap">Stride m/step</label>
        <input
          id="stride"
          type="number"
          step="0.01"
          min="0.5"
          max="1.2"
          value={strideM}
          onChange={e => setStrideM(parseFloat(e.target.value) || 0.78)}
          className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right"
          title="Meters per step used for distance"
        />
      </div>
    </>
  )
}

/* =========================================================
   Sync (copy/paste + reset)
   ========================================================= */
   function SyncBlock() {
    const { state, setState } = useContext(AppContext)
    const [open, setOpen] = useState(false)
    const [text, setText] = useState('')
  
    // --- trip sharing helpers ---
    const tripId = useMemo(() => {
      const url = new URL(window.location.href)
      const fromUrl = url.searchParams.get('trip')
      if (fromUrl) return fromUrl
      // fallback to what App created
      return localStorage.getItem('tripmate.tripId') ?? 'unknown'
    }, [])
  
    const shareUrl = useMemo(() => {
      const { origin, pathname } = window.location
      return `${origin}${pathname}?trip=${tripId}`
    }, [tripId])
  
    async function copyShareUrl() {
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied!')
      } catch {
        alert('Could not copy link')
      }
    }
  
    async function nativeShare() {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'TripMate',
            text: 'Join my trip on TripMate:',
            url: shareUrl,
          })
        } catch {
          // user cancelled or share failed — ignore
        }
      } else {
        // fallback: copy
        copyShareUrl()
      }
    }
  
    function joinTripById(id: string) {
      const clean = id.trim()
      if (!clean) return
      const { origin, pathname } = window.location
      // reloads app under the new tripId (will pull cloud state & subscribe)
      window.location.href = `${origin}${pathname}?trip=${encodeURIComponent(clean)}`
    }
  
    function resetAll() {
      if (!confirm('Reset all TripMate data on this device? This cannot be undone.')) return
      try {
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
            <h3 className="font-semibold">Sync & Share</h3>
            <p className="text-sm text-gray-600">Share this trip or paste data between devices</p>
          </div>
          <button className="rounded-xl bg-gray-100 px-3 py-1" onClick={() => setOpen(v => !v)}>
            {open ? 'Close' : 'Open'}
          </button>
        </div>
  
        {open && (
          <div className="mt-3 border border-gray-200 rounded-2xl p-3 space-y-3">
            {/* Share this trip */}
            <div>
              <div className="text-sm font-medium mb-1">Share this trip</div>
              <div className="text-xs text-gray-600 mb-2">
                Anyone opening this link will join the same live trip (realtime sync).
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    value={shareUrl}
                    readOnly
                  />
                  <button className="rounded-xl bg-gray-100 px-3 py-2 text-sm" onClick={copyShareUrl}>
                    Copy
                  </button>
                  <button className="rounded-xl bg-gray-100 px-3 py-2 text-sm" onClick={nativeShare}>
                    Share
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Trip ID: <span className="font-mono">{tripId}</span>
                </div>
              </div>
            </div>
  
            {/* Join a trip by ID */}
            <div className="pt-2 border-t border-gray-200">
              <div className="text-sm font-medium mb-1">Join another trip</div>
              <JoinTrip />
            </div>
  
            {/* Raw copy/paste backup */}
            <div className="pt-2 border-t border-gray-200">
              <div className="text-sm font-medium mb-1">Manual backup</div>
              <div className="grid gap-2">
                <button
                  className="tile w-full"
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(state))}
                >
                  Copy data (JSON)
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
              </div>
            </div>
  
            {/* Dangerous: reset */}
            <div className="pt-2 border-t border-gray-200">
              <button
                className="tile w-full bg-red-50 text-red-700 hover:bg-red-100"
                onClick={resetAll}
              >
                Reset all data on this device
              </button>
              <p className="text-xs text-gray-500 mt-1">
                This clears local storage only. Cloud data remains under the shared trip.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }
  
  // small sub-component so the join input has its own local state
  function JoinTrip() {
    const [input, setInput] = useState('')
    return (
      <div className="flex items-center gap-2">
        <input
          className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
          placeholder="Enter Trip ID (e.g. trip_ab12cd34)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="rounded-xl bg-gray-100 px-3 py-2 text-sm"
          onClick={() => {
            const id = input.trim()
            if (!id) return
            const { origin, pathname } = window.location
            window.location.href = `${origin}${pathname}?trip=${encodeURIComponent(id)}`
          }}
        >
          Join
        </button>
      </div>
    )
  }
  