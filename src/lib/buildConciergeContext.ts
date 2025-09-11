// src/lib/buildConciergeContext.ts
import type { AppState, Spend } from '../types'

export function buildConciergeContext(state: AppState, opts?: { area?: 'Samui' | 'Doha' }) {
  const area = opts?.area || 'Samui'
  const today = new Date().toISOString().slice(0, 10)

  const restaurants = state.restaurants
    .filter(r => r.area === area)
    .map(r => ({ name: r.name, area: r.area, cuisine: r.cuisine, priceTier: r.priceTier, tags: r.tags, maps: r.googleMapsUrl, approxCostGBP: r.approxCostGBP }))

  const todaysPlan = state.plan
    .filter(p => p.date === today)
    .map(p => ({ time: p.time, kind: p.kind, title: p.title }))

  const budget = summariseBudget(state.spends, state.rates)

  // weather, compact, only today if available
  const weather = state.weather ? {
    area: area,
    today: pickDay(state, area, today)
  } : undefined

  return {
    meta: { startISO: state.startISO, endISO: state.endISO, area },
    restaurants,
    planToday: todaysPlan,
    budget,
    weather
  }
}

function summariseBudget(spends: Spend[], rates: any) {
  const toGBP = (c: 'GBP'|'THB'|'QAR', amt: number) => {
    if (c === 'GBP') return amt
    if (c === 'THB') return amt / (rates.THB || 1)
    if (c === 'QAR') return amt / (rates.QAR || 1)
    return amt
  }
  const totalGBP = spends.reduce((sum, s) => sum + toGBP(s.currency as any, s.amount), 0)
  return { totalGBP: Math.round(totalGBP * 100) / 100, rates }
}

function pickDay(state: AppState, area: 'Samui'|'Doha', dateISO: string) {
  const list = area === 'Samui' ? state.weather?.samui : state.weather?.doha
  if (!list?.length) return null
  return list.find(d => d.date === dateISO) || list[0]
}
