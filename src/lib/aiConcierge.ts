// src/lib/aiConcierge.ts
type ConciergeOpts = {
    question: string
    context: unknown
    cacheKey?: string
    ttlMs?: number
  }
  
  export async function askConcierge({ question, context, cacheKey, ttlMs = 60 * 60 * 1000 }: ConciergeOpts) {
    const key = cacheKey || defaultKey(question, context)
    const cached = readCache(key, ttlMs)
    if (cached) return cached
  
    const res = await fetch('/api/ai-concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error || 'Concierge request failed')
    writeCache(key, data.answer)
    return data.answer as string
  }
  
  function defaultKey(question: string, context?: unknown) {
    const today = new Date().toISOString().slice(0, 10)
    const ctx = context ? JSON.stringify(context).slice(0, 200) : ''
    return `concierge:${today}:${hash(`${question}|${ctx}`)}`
  }
  
  function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return `${h}` }
  
  function readCache(key: string, ttlMs: number) {
    try { const raw = localStorage.getItem(key); if (!raw) return null; const { t, v } = JSON.parse(raw); if (Date.now() - t > ttlMs) return null; return v as string } catch { return null }
  }
  function writeCache(key: string, value: string) { try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value })) } catch {} }
  