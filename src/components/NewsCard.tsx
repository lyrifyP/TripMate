import React, { useEffect, useState } from 'react'
import { fetchNews, type NewsItem } from '../lib/news'
import {
  AlertTriangle, // generic / security
  Plane,         // flights / airports
  CloudRain,     // weather
  ShieldAlert,   // advisories
  RefreshCw,
  ExternalLink
} from 'lucide-react'

type Props = {
  /** Optional search/topic, e.g. "(Doha OR Qatar) OR (Koh Samui OR Thailand)" */
  query?: string
  /** Max headlines to show (default 6) */
  limit?: number
  /** Auto-refresh every N minutes (0 = off) */
  autoRefreshMin?: number
}

type DecoratedItem = NewsItem & {
  severity: 'alert' | 'warning' | 'info'
  category: 'security' | 'flight' | 'weather' | 'advisory' | 'other'
}

const FCDO_LINKS = [
  { label: 'FCDO: Qatar travel advice', href: 'https://www.gov.uk/foreign-travel-advice/qatar' },
  { label: 'FCDO: Thailand travel advice', href: 'https://www.gov.uk/foreign-travel-advice/thailand' },
]

export default function NewsCard({
  query = '(Doha OR Qatar) OR ("Koh Samui" OR Thailand)',
  limit = 6,
  autoRefreshMin = 15,
}: Props) {
  const [items, setItems] = useState<DecoratedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // fetch + decorate
  async function load() {
    try {
      setLoading(true)
      const raw = await fetchNews(query)
      const decorated = raw
        .map(decorateItem)
        .sort(sortBySeverityThenRecency)
        .slice(0, limit)
      setItems(decorated)
      setError(null)
    } catch {
      setError('Latest news unavailable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await load()
      if (cancelled) return
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, limit])

  useEffect(() => {
    if (!autoRefreshMin) return
    const id = setInterval(load, autoRefreshMin * 60 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshMin])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="section-title">Travel news & advisories</h3>
        <button
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 disabled:opacity-60"
          onClick={load}
          disabled={loading}
          aria-label="Refresh headlines"
          title="Refresh headlines"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && <p className="mt-2 text-sm text-gray-600">Loading headlines…</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {!loading && !error && items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((it, i) => (
            <li key={i} className="rounded-xl border border-gray-100 p-2 hover:bg-gray-50">
              <a
                href={it.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 shrink-0">{iconFor(it.category, it.severity)}</span>
                <span className="min-w-0">
                  <span className="block text-sm text-gray-900 leading-snug">
                    {highlightKeywords(it.title)}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <span className={badgeClass(it.severity)}>{cap(it.severity)}</span>
                      <span className="text-gray-400">•</span>
                      <span>{it.source || 'Source'}</span>
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>{relativeTime(it.publishedAt)}</span>
                    <ExternalLink size={12} className="opacity-70" />
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* footer: official links */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FCDO_LINKS.map(l => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 inline-flex items-center gap-1"
            title="Opens official UK travel advice"
          >
            <ShieldAlert size={12} />
            {l.label}
          </a>
        ))}
      </div>
    </div>
  )
}

/* ------------ helpers ------------- */

function decorateItem(it: NewsItem): DecoratedItem {
  const t = (it.title || '').toLowerCase()

  const isWeather = /storm|typhoon|flood|heavy rain|heatwave|monsoon|cyclone/.test(t)
  const isFlight  = /flight|airport|runway|airline|canceled|cancelled|delay|strike/.test(t)
  const isAdvisory= /advisory|warning|alert|embassy|quarantine|entry|visa|passport|border/.test(t)
  const isSecurity= /protest|unrest|security|attack|explosion|missile|conflict|evacuate|curfew/.test(t)

  let category: DecoratedItem['category'] = 'other'
  if (isSecurity) category = 'security'
  else if (isAdvisory) category = 'advisory'
  else if (isFlight) category = 'flight'
  else if (isWeather) category = 'weather'

  let severity: DecoratedItem['severity'] = 'info'
  if (isSecurity) severity = 'alert'
  else if (isWeather || isFlight || isAdvisory) severity = 'warning'

  return { ...it, category, severity }
}

function iconFor(cat: DecoratedItem['category'], sev: DecoratedItem['severity']) {
  const common = 'w-4 h-4'
  if (cat === 'flight')   return <Plane className={common + ' text-sky-600'} />
  if (cat === 'weather')  return <CloudRain className={common + ' text-blue-600'} />
  if (cat === 'advisory') return <ShieldAlert className={common + ' text-amber-600'} />
  if (cat === 'security') return <AlertTriangle className={common + ' text-red-600'} />
  // default
  return <AlertTriangle className={common + ' text-gray-500'} />
}

function badgeClass(sev: DecoratedItem['severity']) {
  if (sev === 'alert') return 'px-1.5 py-0.5 rounded bg-red-50 text-red-700'
  if (sev === 'warning') return 'px-1.5 py-0.5 rounded bg-amber-50 text-amber-700'
  return 'px-1.5 py-0.5 rounded bg-gray-100 text-gray-700'
}

function relativeTime(iso?: string) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, Math.floor((now - then) / 1000))
  const mins = Math.floor(diff / 60)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (diff < 60) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function sortBySeverityThenRecency(a: DecoratedItem, b: DecoratedItem) {
  const sevRank = (s: DecoratedItem['severity']) => (s === 'alert' ? 0 : s === 'warning' ? 1 : 2)
  const sa = sevRank(a.severity)
  const sb = sevRank(b.severity)
  if (sa !== sb) return sa - sb
  return (new Date(b.publishedAt || 0).getTime()) - (new Date(a.publishedAt || 0).getTime())
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function highlightKeywords(title?: string) {
  if (!title) return null
  // lightweight emphasis for high-signal words
  const rx = /(warning|alert|cancelled|canceled|strike|storm|security|protest|entry|visa|advisory)/ig
  const parts = title.split(rx)
  return (
    <>
      {parts.map((p, i) =>
        rx.test(p) ? (
          <mark key={i} className="bg-yellow-100 text-yellow-800 px-0.5 rounded">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}
