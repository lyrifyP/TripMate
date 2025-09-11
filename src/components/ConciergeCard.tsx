import React, { useState, useMemo, useContext } from 'react'
import { askConcierge } from '../lib/aiConcierge'
import { buildConciergeContext } from '../lib/buildConciergeContext'
import { AppContext } from '../App'
import ReactMarkdown from 'react-markdown'

export default function ConciergeCard() {
  const { state } = useContext(AppContext)
  const [q, setQ] = useState('')
  const [a, setA] = useState('')
  const [loading, setLoading] = useState(false)
  const [area, setArea] = useState<'Samui'|'Doha'>('Samui')
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0,10))

  const includeMoney = /\b(budget|spend|spending|cost|price|afford|cheap|expensive|money)\b/i.test(q)

  const ctx = useMemo(
    () => buildConciergeContext(state, { area, dateISO, includeMoney }),
    [state, area, dateISO, includeMoney]
  )

  async function onAsk(e?: React.FormEvent) {
    e?.preventDefault()
    if (!q.trim()) return
    setLoading(true)
    try {
      const answer = await askConcierge({ question: q.trim(), context: ctx })
      setA(answer)
    } catch {
      setA('Sorry, I could not answer that just now')
    } finally {
      setLoading(false)
    }
  }

  function onClear() { setQ(''); setA('') }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 p-3">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2">
          <button type="button" onClick={() => setArea('Samui')}
            className={`px-3 py-1 rounded-lg text-sm ${area==='Samui' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'}`}>
            Samui
          </button>
          <button type="button" onClick={() => setArea('Doha')}
            className={`px-3 py-1 rounded-lg text-sm ${area==='Doha' ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'}`}>
            Doha
          </button>
        </div>

        <input
          type="date"
          value={dateISO}
          onChange={e => setDateISO(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-300 text-sm"
        />

        <button
          type="button"
          onClick={() => setQ('Summarise my plan for this day')}
          className="px-3 py-2 rounded-xl bg-gray-100 text-gray-800 text-sm"
        >
          Summarise day
        </button>
      </div>

      {/* Input and actions */}
      <form onSubmit={onAsk} className="flex flex-wrap items-stretch gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Ask about plans, food, or budget"
          className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-gray-300"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 whitespace-nowrap min-w-[88px] px-3 py-2 rounded-xl bg-black text-white text-sm disabled:opacity-50 text-center"
        >
          {loading ? 'Thinking…' : 'Ask'}
        </button>
        {a && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 whitespace-nowrap min-w-[88px] px-3 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm text-center"
          >
            Clear
          </button>
        )}
      </form>

      {a && (
        <div className="text-sm leading-relaxed bg-gray-50 p-3 rounded-xl prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              a: ({node, ...props}) => (
                <a {...props} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {a}
          </ReactMarkdown>
        </div>
      )}

      <p className="text-xs text-gray-500">
        The concierge uses your restaurants, plan, selected day, and weather. It only discusses money if you ask about it.
      </p>
    </div>
  )
}
