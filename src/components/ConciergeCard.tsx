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

  const ctx = useMemo(() => buildConciergeContext(state, { area: 'Samui' }), [state])

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

  function onClear() {
    setQ('')
    setA('')
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">TripMate Concierge</h3>
      </div>

      <form onSubmit={onAsk} className="flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Ask about plans, food, or budget"
          className="flex-1 px-3 py-2 rounded-xl border border-gray-300"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 rounded-xl bg-black text-white text-sm disabled:opacity-50"
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
        {a && (
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm"
          >
            Clear
          </button>
        )}
      </form>

      {a && (
        <div className="text-sm leading-relaxed bg-gray-50 p-3 rounded-xl prose prose-sm max-w-none">
          <ReactMarkdown>{a}</ReactMarkdown>
        </div>
      )}

      <p className="text-xs text-gray-500">
        The concierge uses your restaurants, plan, budget, and weather to reply.
      </p>
    </div>
  )
}
