import type { Rates, Currency } from '../types'

export function defaultRates(): Rates {
  return {
    GBP: 1,
    THB: 46,
    QAR: 4.6,
    lastUpdatedISO: new Date().toISOString(),
    manualOverride: false,
  }
}

function ok(n: unknown) {
  const v = Number(n)
  return Number.isFinite(v) && v > 0 ? v : null
}

async function fromExchangerateHost() {
  const res = await fetch('https://api.exchangerate.host/latest?base=GBP&symbols=THB,QAR')
  if (!res.ok) throw new Error('host HTTP ' + res.status)
  const j = await res.json()
  const THB = ok(j?.rates?.THB)
  const QAR = ok(j?.rates?.QAR)
  if (!THB || !QAR) throw new Error('host missing THB or QAR')
  return { THB, QAR }
}

async function fromERAPI() {
  const res = await fetch('https://open.er-api.com/v6/latest/GBP')
  if (!res.ok) throw new Error('erapi HTTP ' + res.status)
  const j = await res.json()
  if (j?.result !== 'success') throw new Error('erapi result ' + j?.result)
  const THB = ok(j?.rates?.THB)
  const QAR = ok(j?.rates?.QAR)
  if (!THB || !QAR) throw new Error('erapi missing THB or QAR')
  return { THB, QAR }
}

async function fromFloatRates() {
  const res = await fetch('https://www.floatrates.com/daily/gbp.json')
  if (!res.ok) throw new Error('floatrates HTTP ' + res.status)
  const j = await res.json()
  // floatrates keys are lowercase
  const THB = ok(j?.thb?.rate)
  const QAR = ok(j?.qar?.rate)
  if (!THB || !QAR) throw new Error('floatrates missing THB or QAR')
  return { THB, QAR }
}

export async function fetchLiveRates(): Promise<Rates> {
  const errors: string[] = []
  for (const fn of [fromExchangerateHost, fromERAPI, fromFloatRates]) {
    try {
      const { THB, QAR } = await fn()
      return {
        GBP: 1,
        THB,
        QAR,
        lastUpdatedISO: new Date().toISOString(),
        manualOverride: false,
      }
    } catch (e: any) {
      errors.push(e?.message ?? String(e))
    }
  }
  throw new Error('FX data missing, tried 3 sources, ' + errors.join(' | '))
}

export function convert(amount: number, from: Currency, to: Currency, rates: Rates) {
  const get = (c: Currency) => (c === 'GBP' ? 1 : rates[c])
  const inGBP = amount / get(from)
  return inGBP * get(to)
}

export function formatGBP(v: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(v)
}
