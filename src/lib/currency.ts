import type { Rates, Currency } from '../types'

export function defaultRates(): Rates {
  return { GBP: 1, THB: 46, QAR: 4.6, lastUpdatedISO: new Date().toISOString(), manualOverride: true }
}

export function convert(amount: number, from: Currency, to: Currency, rates: Rates) {
  const get = (c: Currency) => (c === 'GBP' ? 1 : rates[c])
  const inGBP = amount / get(from)
  return inGBP * get(to)
}

export function formatGBP(v: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(v)
}
