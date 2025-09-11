// pages/api/ai-concierge.ts
export default async function handler(req: any, res: any) {
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }) }
  
      const key = process.env.OPENAI_API_KEY
      if (!key) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' })
  
      const { question, context } = req.body || {}
  
      const system = [
        'You are TripMate Concierge, concise and practical.',
        'Use only the JSON context provided.',
        'Spend is money already spent, budget is a user target, do not confuse the two.',
        'If budget is missing, do not assume one, talk only about spend.',
        'Recommend restaurants from the provided list, include area.',
        'If focusArea is present, prioritise that area but you may mention good options from the other area clearly labelled.'
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
  