// /api/news.ts  (for Vite/CRA on Vercel)
// or src/pages/api/news.ts for Next.js (export default handler instead of default export fn signature differences)

export default async function handler(req: any, res: any) {
    try {
      const key = process.env.NEWS_API_KEY
      if (!key) {
        console.error('NEWS_API_KEY missing')
        return res.status(500).json({ error: 'Server not configured' })
      }
  
      const q = (req.query?.query as string) || 'Qatar OR Doha OR "Koh Samui" OR Thailand'
      // Example using NewsAPI.org (works server-side only)
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${key}`
  
      const r = await fetch(url)
      if (!r.ok) {
        const txt = await r.text()
        console.error('News upstream error:', r.status, txt)
        return res.status(502).json({ error: 'Upstream error' })
      }
  
      const data = await r.json()
      const items =
        (data.articles || []).map((a: any) => ({
          title: a.title,
          url: a.url,
          source: a.source?.name,
          publishedAt: a.publishedAt,
        })) ?? []
  
      return res.status(200).json({ items })
    } catch (e: any) {
      console.error('News route failed:', e?.message || e)
      return res.status(500).json({ error: 'News route failed' })
    }
  }
  