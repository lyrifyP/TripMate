import type { Rates, Currency } from '../types'

export function defaultRates(): Rates {
  // Start with safe placeholders, fetch will replace them on load
  return {
    GBP: 1,
    THB: 46,
    QAR: 4.6,
    lastUpdatedISO: new Date().toISOString(),
    manualOverride: false,
  }
}

export async function fetchLiveRates(): Promise<Rates> {
  // Frankfurter, free and no key, base GBP
  const res = await fetch('https://api.frankfurter.app/latest?from=GBP&to=THB,QAR')
  if (!res.ok) throw new Error('FX HTTP ' + res.status)
  const json = await res.json()
  const THB = Number(json?.rates?.THB)
  const QAR = Number(json?.rates?.QAR)
  if (!THB || !QAR) throw new Error('FX data missing')
  return {
    GBP: 1,
    THB,
    QAR,
    lastUpdatedISO: new Date().toISOString(),
    manualOverride: false,
  }
}

export function convert(amount: number, from: Currency, to: Currency, rates: Rates) {
  const get = (c: Currency) => (c === 'GBP' ? 1 : rates[c])
  const inGBP = amount / get(from)
  return inGBP * get(to)
}

export function formatGBP(v: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(v)
}
