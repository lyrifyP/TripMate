// api/flight.ts
export default async function handler(req: any, res: any) {
  try {
    const raw = (req.query?.num as string) || (req.query?.number as string) || ''
    const date = (req.query?.date as string || '').trim()
    const num = raw.trim().replace(/\s+/g, '').toUpperCase()
    if (!/^[A-Z]{2}\d{2,4}$/.test(num)) {
      return res.status(400).json({ error: 'Invalid flight number, use like QR24' })
    }

    // 1) Try Aviationstack
    const aviKey = process.env.AVIATIONSTACK_KEY
    if (aviKey) {
      const url = new URL('http://api.aviationstack.com/v1/flights')
      url.searchParams.set('access_key', aviKey)
      url.searchParams.set('flight_iata', num)
      if (date) url.searchParams.set('flight_date', date)

      const r = await fetch(url.toString(), { cache: 'no-store' })
      const text = await r.text()
      let body: any = null
      try { body = JSON.parse(text) } catch { /* keep as text */ }

      const restricted = !!body?.error && String(body.error?.code).includes('function_access_restricted')

      if (r.ok && !body?.error) {
        const first = Array.isArray(body?.data) && body.data.length ? body.data[0] : null
        if (first) {
          return res.status(200).json(normaliseFromAviationstack(first, num))
        }
        // fall through to 404 after trying fallback
      } else if (!restricted) {
        // not a plan restriction, return the real upstream error
        return res.status(502).json({ error: 'Aviationstack error', detail: body || text })
      }
      // else restricted, try fallback
    }

    // 2) Fallback to AeroDataBox via RapidAPI, requires RAPIDAPI_KEY
    const rapid = process.env.RAPIDAPI_KEY
    if (!rapid) {
      // no fallback key, return clear message
      return res.status(402).json({
        error: 'Plan restricted',
        detail: 'Your Aviationstack plan does not allow this function and no RapidAPI fallback is configured',
      })
    }

    const when = date || new Date().toISOString().slice(0, 10)
    const adbUrl = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(num)}/${when}`
    const r2 = await fetch(adbUrl, {
      headers: {
        'X-RapidAPI-Key': rapid,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
      cache: 'no-store',
    })

    const text2 = await r2.text()
    let body2: any = null
    try { body2 = JSON.parse(text2) } catch { /* keep as text */ }

    if (!r2.ok) {
      return res.status(502).json({ error: 'AeroDataBox error', detail: body2 || text2 })
    }

    const item = Array.isArray(body2) ? body2[0] : body2?.flights?.[0] || body2
    if (!item) return res.status(404).json({ error: 'Flight not found for that date' })

    return res.status(200).json(normaliseFromADB(item, num))

  } catch (e: any) {
    return res.status(500).json({ error: 'Flight route failed', detail: e?.message || String(e) })
  }
}

// map Aviationstack shape to your app
function normaliseFromAviationstack(first: any, fallbackNum: string) {
  return {
    flight: {
      iata: first.flight?.iata ?? fallbackNum,
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
}

// map AeroDataBox shape to your app
function normaliseFromADB(item: any, fallbackNum: string) {
  return {
    flight: {
      airline: item.airline?.name || item.airline || item?.marketingCarriers?.[0]?.name || null,
      iata: item.number || fallbackNum,
      icao: item.number || null,
      status: item.status || item.statusText || item?.statusV2 || null,
    },
    departure: {
      airport: item.departure?.airport?.name || item.departure?.airport || null,
      iata: item.departure?.airport?.iata || null,
      terminal: item.departure?.terminal || null,
      gate: item.departure?.gate || null,
      scheduled: item.departure?.scheduledTimeUtc || item.departure?.scheduledTimeLocal || null,
      estimated: item.departure?.estimatedTimeUtc || item.departure?.estimatedTimeLocal || null,
      actual: item.departure?.actualTimeUtc || item.departure?.actualTimeLocal || null,
    },
    arrival: {
      airport: item.arrival?.airport?.name || item.arrival?.airport || null,
      iata: item.arrival?.airport?.iata || null,
      terminal: item.arrival?.terminal || null,
      gate: item.arrival?.gate || null,
      baggage: item.arrival?.baggageBelt || null,
      scheduled: item.arrival?.scheduledTimeUtc || item.arrival?.scheduledTimeLocal || null,
      estimated: item.arrival?.estimatedTimeUtc || item.arrival?.estimatedTimeLocal || null,
      actual: item.arrival?.actualTimeUtc || item.arrival?.actualTimeLocal || null,
    },
    live: null,
  }
}
