// pages/api/ai-concierge.ts
export default async function handler(req: any, res: any) {
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }
  
      const key = process.env.OPENAI_API_KEY
      if (!key) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' })
  
      const { question, context } = req.body || {}
  
      const system = [
        'You are TripMate Concierge, a concise, helpful travel assistant.',
        'Use only the JSON context provided, prefer user data over generic advice.',
        'Be specific and practical, keep answers to 2 or 3 short paragraphs, or a tight list.',
        'If restaurants are provided, recommend only from that list, include priceTier and area.',
        'If budget is provided, convert to GBP using given rates and be money aware.',
        'If weather is provided, reference it briefly, advise on timing if rain risk is high.',
        'If plan data exists, avoid double booking, suggest open slots.',
        'Respond in UK English.'
      ].join(' ')
  
      const user = [
        `Question: ${question}`,
        `Context JSON: ${JSON.stringify(context)}`
      ].join('\n')
  
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.2,
          max_tokens: 400,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }),
      })
  
      const data = await r.json()
      if (!r.ok) return res.status(502).json({ error: 'AI call failed', detail: data })
      const answer = data?.choices?.[0]?.message?.content?.trim() || 'Sorry, no answer.'
      return res.status(200).json({ answer })
    } catch {
      return res.status(500).json({ error: 'ai-concierge failed' })
    }
  }
  