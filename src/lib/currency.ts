import type { Rates } from '../types'

export function defaultRates(): Rates {
  return { GBP: 1, THB: 46, QAR: 4.6, lastUpdatedISO: new Date().toISOString(), manualOverride: true }
}

export function convert(amount: number, from: keyof Rates, to: keyof Rates, rates: Rates) {
  if (from === to) return amount
  const inGBP = amount / (from === 'GBP' ? 1 : rates[from])
  return inGBP * (to === 'GBP' ? 1 : rates[to])
}

export function formatGBP(v: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(v)
}
