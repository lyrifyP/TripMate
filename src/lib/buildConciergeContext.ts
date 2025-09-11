// src/lib/buildConciergeContext.ts
import type { AppState, WeatherDay } from '../types'

function pickDay(state: AppState, area: 'Samui'|'Doha', dateISO: string): WeatherDay | null {
  const list = area === 'Samui' ? state.weather?.samui : state.weather?.doha
  if (!list?.length) return null
  const exact = list.find(d => d.date === dateISO)
  return exact || list[0]
}

export function buildConciergeContext(
  state: AppState,
  opts?: { area?: 'Samui'|'Doha'; dateISO?: string; includeMoney?: boolean }
) {
  const area = opts?.area || 'Samui'
  const dateISO = opts?.dateISO || new Date().toISOString().slice(0,10)

  const today = pickDay(state, area, dateISO)
  const tomorrow = pickDay(state, area, addDaysISO(dateISO, 1))

  const payload: any = {
    meta: { focusArea: area, dateISO, startISO: state.startISO, endISO: state.endISO },
    restaurants: state.restaurants.map(r => ({ name: r.name, area: r.area, cuisine: r.cuisine, priceTier: r.priceTier, tags: r.tags, maps: r.googleMapsUrl, approxCostGBP: r.approxCostGBP, favourite: !!r.favourite })),
    planForDay: state.plan.filter(p => p.date === dateISO).map(p => ({ time: p.time, kind: p.kind, title: p.title, area: p.area })),
    weather: state.weather ? {
      focusArea: area,
      today: today ? {
        date: today.date,
        min: today.min,
        max: today.max,
        code: today.code,
        precipProb: today.precipProb,
        precipMm: today.precipMm,
        hours: today.hours?.map(h => ({
          timeISO: h.timeISO,
          precipProb: h.precipProb,
          precipMm: h.precipMm,
          tempC: h.tempC,
        })),
      } : null,
      tomorrow: tomorrow ? {
        date: tomorrow.date,
        min: tomorrow.min,
        max: tomorrow.max,
        code: tomorrow.code,
        precipProb: tomorrow.precipProb,
        precipMm: tomorrow.precipMm,
      } : null,
    } : undefined,
  }

  if (opts?.includeMoney) {
    payload.money = { spend: summariseSpend(state.spends, state.rates), budget: (state as any).budget || null }
  }

  return payload
}

function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0,10)
}

function summariseSpend(spends: any[], rates: { GBP: number; THB: number; QAR: number }) {
  const toGBP = (c: 'GBP'|'THB'|'QAR', amt: number) => c === 'GBP' ? amt : c === 'THB' ? amt / (rates.THB || 1) : amt / (rates.QAR || 1)
  const totalGBP = spends.reduce((sum, s) => sum + toGBP(s.currency, s.amount), 0)
  const byArea = spends.reduce((acc, s) => { const gbp = toGBP(s.currency, s.amount); acc[s.area] = (acc[s.area] || 0) + gbp; return acc }, {} as Record<'Samui'|'Doha', number>)
  return { totalGBP: Math.round(totalGBP * 100) / 100, byArea }
}
