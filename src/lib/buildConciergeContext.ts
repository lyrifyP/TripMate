// src/lib/buildConciergeContext.ts
import type { AppState, Spend, WeatherDay } from '../types'

type BuildOpts = {
  area?: 'Samui' | 'Doha'
  dateISO?: string
  includeMoney?: boolean
}

export function buildConciergeContext(state: AppState, opts?: BuildOpts) {
  const area = opts?.area || 'Samui'
  const dateISO = opts?.dateISO || todayISO()

  // Restaurants from both areas
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

  // Compact weather
  const weather = state.weather
    ? {
        focusArea: area,
        today: pickNearestDay(state, area, dateISO),
        tomorrow: pickNearestDay(state, area, addDaysISO(dateISO, 1)),
      }
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

/**
 * Returns the exact date if present, otherwise the closest date in the list.
 * Never returns null if there is at least one day in the area.
 */
function pickNearestDay(state: AppState, area: 'Samui' | 'Doha', targetISO: string): WeatherDay | null {
  const list = area === 'Samui' ? state.weather?.samui : state.weather?.doha
  if (!list || list.length === 0) return null

  const exact = list.find(d => d.date === targetISO)
  if (exact) return exact

  const target = new Date(targetISO).getTime()
  let best: WeatherDay = list[0]
  let bestDiff = Math.abs(new Date(best.date).getTime() - target)
  for (let i = 1; i < list.length; i++) {
    const diff = Math.abs(new Date(list[i].date).getTime() - target)
    if (diff < bestDiff) {
      best = list[i]
      bestDiff = diff
    }
  }
  return best
}

function summariseSpend(
  spends: Spend[],
  rates: { GBP: number; THB: number; QAR: number }
) {
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

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
