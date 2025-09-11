// src/lib/buildConciergeContext.ts
import type { AppState, Spend } from '../types'

type BuildOpts = {
  area?: 'Samui' | 'Doha'
  dateISO?: string
  includeMoney?: boolean
}

export function buildConciergeContext(state: AppState, opts?: BuildOpts) {
  const area = opts?.area || 'Samui'
  const dateISO = opts?.dateISO || new Date().toISOString().slice(0, 10)

  // Restaurants from both areas, the model will prioritise focusArea
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

  // Plan for the selected day
  const planForDay = state.plan
    .filter(p => p.date === dateISO)
    .map(p => ({ time: p.time, kind: p.kind, title: p.title, area: p.area }))

  // Compact weather, only the selected area and day
  const weather = state.weather
    ? { focusArea: area, day: pickDay(state, area, dateISO) }
    : undefined

  const payload: any = {
    meta: { startISO: state.startISO, endISO: state.endISO, focusArea: area, dateISO },
    restaurants,
    planForDay,
    weather,
  }

  if (opts?.includeMoney) {
    payload.money = {
      spend: summariseSpend(state.spends, state.rates),
      budget: (state as any).budget || null, // optional in your AppState
    }
  }

  return payload
}

function pickDay(state: AppState, area: 'Samui' | 'Doha', dateISO: string) {
  const list = area === 'Samui' ? state.weather?.samui : state.weather?.doha
  return list?.find(d => d.date === dateISO) || list?.[0] || null
}

function summariseSpend(spends: Spend[], rates: { GBP: number; THB: number; QAR: number }) {
  const toGBP = (c: 'GBP' | 'THB' | 'QAR', amt: number) => {
    if (c === 'GBP') return amt
    if (c === 'THB') return amt / (rates.THB || 1)
    return amt / (rates.QAR || 1)
  }

  const totalGBP = spends.reduce((sum, s) => sum + toGBP(s.currency as any, s.amount), 0)

  const byArea = spends.reduce((acc, s) => {
    const gbp = toGBP(s.currency as any, s.amount)
    acc[s.area] = (acc[s.area] || 0) + gbp
    return acc
  }, {} as Record<'Samui' | 'Doha', number>)

  return {
    totalGBP: Math.round(totalGBP * 100) / 100,
    byArea,
  }
}
