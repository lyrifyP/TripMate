// /api/flight.ts
export default async function handler(req: any, res: any) {
    try {
      const key = process.env.AVIATIONSTACK_KEY
      if (!key) {
        console.error('AVIATIONSTACK_KEY missing')
        return res.status(500).json({ error: 'Server not configured' })
      }
  
      const num = (req.query?.number as string || '').trim() // e.g. QR24, QR 24 also ok
      const date = (req.query?.date as string || '').trim()  // optional yyyy-mm-dd
      if (!num) return res.status(400).json({ error: 'Missing ?number=QR24' })
  
      // Clean up variants like "QR 24"
      const flightNum = num.replace(/\s+/g, '')
  
      // We’ll search by IATA code (e.g. QR24)
      const url = new URL('http://api.aviationstack.com/v1/flights')
      url.searchParams.set('access_key', key)
      url.searchParams.set('flight_iata', flightNum)
      if (date) url.searchParams.set('flight_date', date)
  
      const r = await fetch(url.toString())
      if (!r.ok) {
        const txt = await r.text()
        console.error('Aviationstack error:', r.status, txt)
        return res.status(502).json({ error: 'Upstream error' })
      }
      const data = await r.json()
  
      const first = (data?.data || [])[0]
      if (!first) return res.status(404).json({ error: 'Flight not found' })
  
      // Normalize a compact payload for the UI
      const out = {
        flight: {
          iata: first.flight?.iata ?? null,
          icao: first.flight?.icao ?? null,
          number: first.flight?.number ?? null,
          airline: first.airline?.name ?? null,
          status: first.flight_status ?? null, // scheduled, active, landed, cancelled, etc.
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
        live: first.live ?? null, // may be null on free plans
      }
  
      return res.status(200).json(out)
    } catch (e: any) {
      console.error('Flight route failed:', e?.message || e)
      return res.status(500).json({ error: 'Flight route failed' })
    }
  }
  