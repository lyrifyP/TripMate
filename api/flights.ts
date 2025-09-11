// Vercel serverless function, TypeScript is supported out of the box
export default async function handler(req: any, res: any) {
    try {
      const key = process.env.AVIATIONSTACK_KEY
      if (!key) return res.status(500).json({ error: 'Server not configured' })
  
      // accept both ?num= and ?number=
      const raw = (req.query?.num as string) || (req.query?.number as string) || ''
      const date = (req.query?.date as string || '').trim()
      const num = raw.trim()
      if (!num) return res.status(400).json({ error: 'Missing ?num=QR24' })
  
      const flightNum = num.replace(/\s+/g, '')
  
      const url = new URL('http://api.aviationstack.com/v1/flights')
      url.searchParams.set('access_key', key)
      url.searchParams.set('flight_iata', flightNum)
      if (date) url.searchParams.set('flight_date', date)
  
      const r = await fetch(url.toString())
      const data = await r.json()
  
      if (!r.ok || data?.error) {
        const info = data?.error?.info || `Upstream error ${r.status}`
        return res.status(502).json({ error: info })
      }
  
      const first = Array.isArray(data?.data) && data.data.length ? data.data[0] : null
      if (!first) return res.status(404).json({ error: 'Flight not found' })
  
      const out = {
        flight: {
          iata: first.flight?.iata ?? null,
          icao: first.flight?.icao ?? null,
          number: first.flight?.number ?? null,
          airline: first.airline?.name ?? null,
          status: first.flight_status ?? null,
        },
        departure: {
          airport: first.departure?.airport ?? null,
          iata: first.departure?.iata ?? null,
          terminal: first.departure?.terminal ?? null,
          gate: first.departure?.gate ?? null,
          scheduled: first.departure?.scheduled ?? null,
          estimated: first.departure?.estimated ?? null,
          actual: first.departure?.actual ?? null,
        },
        arrival: {
          airport: first.arrival?.airport ?? null,
          iata: first.arrival?.iata ?? null,
          terminal: first.arrival?.terminal ?? null,
          gate: first.arrival?.gate ?? null,
          baggage: first.arrival?.baggage ?? null,
          scheduled: first.arrival?.scheduled ?? null,
          estimated: first.arrival?.estimated ?? null,
          actual: first.arrival?.actual ?? null,
        },
        live: first.live ?? null,
      }
  
      return res.status(200).json(out)
    } catch (e: any) {
      return res.status(500).json({ error: 'Flight route failed' })
    }
  }
  