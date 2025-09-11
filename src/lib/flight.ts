// src/lib/flight.ts
export type LiveFlightStatus = {
    flight: {
      iata: string | null
      icao: string | null
      number: string | null
      airline: string | null
      status: string | null
    }
    departure: {
      airport: string | null
      iata: string | null
      terminal: string | null
      gate: string | null
      scheduled: string | null
      estimated: string | null
      actual: string | null
    }
    arrival: {
      airport: string | null
      iata: string | null
      terminal: string | null
      gate: string | null
      baggage: string | null
      scheduled: string | null
      estimated: string | null
      actual: string | null
    }
    live: any | null
  }
  
  export async function fetchFlightStatus(flightNumber: string, date?: string): Promise<LiveFlightStatus> {
    const url = new URL('/api/flight', window.location.origin)
    url.searchParams.set('number', flightNumber)
    if (date) url.searchParams.set('date', date)
  
    const r = await fetch(url.toString())
    if (!r.ok) {
      throw new Error(`Flight API ${r.status}`)
    }
    return r.json()
  }
  
  export function pctComplete(startISO?: string | null, endISO?: string | null, now = new Date()) {
    if (!startISO || !endISO) return 0
    const s = new Date(startISO).getTime()
    const e = new Date(endISO).getTime()
    const n = now.getTime()
    if (e <= s) return 0
    return Math.max(0, Math.min(100, Math.round(((n - s) / (e - s)) * 100)))
  }
  