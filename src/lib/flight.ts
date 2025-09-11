// lib/flight.ts
export type LiveFlightStatus = {
    flight: { airline?: string, iata?: string, icao?: string, status?: string }
    departure: { airport?: string, iata?: string, terminal?: string, gate?: string, scheduled?: string, estimated?: string, actual?: string }
    arrival:   { airport?: string, iata?: string, terminal?: string, gate?: string, scheduled?: string, estimated?: string, actual?: string, baggage?: string }
  }
  
  function normalise(raw: string) {
    return raw.replace(/\s+/g, '').toUpperCase()
  }
  
  export async function fetchFlightStatus(flightNumRaw: string, dateISO?: string): Promise<LiveFlightStatus> {
    const num = normalise(flightNumRaw)
    if (!/^[A-Z]{2}\d{2,4}$/.test(num)) throw new Error('Flight number looks invalid')
  
    const qs = new URLSearchParams({ num })
    if (dateISO) qs.set('date', dateISO)
  
    const res = await fetch(`/api/flight?${qs.toString()}`)
    if (!res.ok) {
      const msg = await res.text().catch(() => '')
      throw new Error(msg || `Lookup failed ${res.status}`)
    }
    return res.json()
  }
  