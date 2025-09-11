import type { AppState, Spend } from '../types'

export function buildConciergeContext(state: AppState, opts?: { area?: 'Samui'|'Doha' }) {
  const area = opts?.area || 'Samui'
  const today = new Date().toISOString().slice(0, 10)

  const restaurants = state.restaurants.map(r => ({
    name: r.name,
    area: r.area,
    cuisine: r.cuisine,
    priceTier: r.priceTier,
    tags: r.tags,
    maps: r.googleMapsUrl,
    approxCostGBP: r.approxCostGBP,
    favourite: !!r.favourite,
  }))

  const planToday = state.plan
    .filter(p => p.date === today)
    .map(p => ({ time: p.time, kind: p.kind, title: p.title, area: p.area }))

  const spend = summariseSpend(state.spends, state.rates)             // spent-to-date
  const budget = state.budget || null                                  // optional targets

  const weather = state.weather ? {                                    // unchanged
    [area.toLowerCase()]: pickDay(state, area, today)
  } : undefined

  return {
    meta: { startISO: state.startISO, endISO: state.endISO, focusArea: area },
    restaurants,               // now includes both Samui and Doha entries
    planToday,
    money: { spend, budget },  // clear naming, spend != budget
    weather
  }
}

function summariseSpend(spends: Spend[], rates: any) {
  const toGBP = (c: 'GBP'|'THB'|'QAR', amt: number) =>
    c === 'GBP' ? amt : c === 'THB' ? amt / (rates.THB || 1) : amt / (rates.QAR || 1)

  const totalGBP = spends.reduce((sum, s) => sum + toGBP(s.currency as any, s.amount), 0)

  const byArea = spends.reduce((acc, s) => {
    const gbp = toGBP(s.currency as any, s.amount)
    acc[s.area] = (acc[s.area] || 0) + gbp
    return acc
  }, {} as Record<'Samui'|'Doha', number>)

  return {
    totalGBP: Math.round(totalGBP * 100) / 100,
    byArea
  }
}

function pickDay(state: AppState, area: 'Samui'|'Doha', dateISO: string) {
  const list = area === 'Samui' ? state.weather?.samui : state.weather?.doha
  return list?.find(d => d.date === dateISO) || list?.[0] || null
}
