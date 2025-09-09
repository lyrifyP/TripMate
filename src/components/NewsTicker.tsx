import React, { useEffect, useState } from 'react'
import { fetchNews, type NewsItem } from '../lib/news'
import { AlertTriangle } from 'lucide-react'

type Props = {
  /** Optional search/topic, e.g. "Doha OR Qatar" */
  query?: string
  /** Max headlines to show before looping (default 10) */
  limit?: number
  /** Seconds per full scroll loop (default 25) */
  speedSec?: number
  /** If true, renders as a plain strip (no border/background)
   *  so it sits nicely inside a parent card like CollapsibleCard. */
  embed?: boolean
}

export default function NewsTicker({
  query,
  limit = 10,
  speedSec = 25,
  embed = true,
}: Props) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [paused, setPaused] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const news = await fetchNews(query)
        if (!cancelled) setItems(news.slice(0, limit))
      } catch {
        if (!cancelled) setError('Latest news unavailable')
      }
    })()
    return () => { cancelled = true }
  }, [query, limit])

  if (error || items.length === 0) {
    return (
      <div className={embed ? 'p-2 text-xs text-gray-600' :
        'rounded-2xl border border-gray-200 bg-white p-2 text-xs text-gray-600'}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-600" />
          {error ?? 'No recent headlines.'}
        </div>
      </div>
    )
  }

  // Accessibility: treat as a region; allow pausing via hover/tap/focus.
  return (
    <div
      className={embed ? 'overflow-hidden' : 'rounded-2xl border border-gray-200 bg-white overflow-hidden'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(p => !p)}
      aria-live="polite"
      role="region"
      aria-roledescription="news ticker"
      aria-label="Latest travel headlines"
    >
      <div className="relative">
        <div
          className="ticker-track whitespace-nowrap text-sm py-2"
          style={{ animation: paused ? 'none' : `ticker ${speedSec}s linear infinite` }}
          tabIndex={0}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {items.map((it, i) => (
            <a
              key={i}
              href={it.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 text-gray-800 hover:underline"
            >
              <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                {it.source ?? 'Source'}
              </span>
              <span className="opacity-90">{it.title}</span>
            </a>
          ))}
          {/* duplicate once for seamless loop */}
          {items.map((it, i) => (
            <a
              key={'dup-' + i}
              href={it.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 text-gray-800 hover:underline"
            >
              <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                {it.source ?? 'Source'}
              </span>
              <span className="opacity-90">{it.title}</span>
            </a>
          ))}
        </div>
      </div>

      {/* prefers-reduced-motion support */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .ticker-track { animation: none !important; }
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
