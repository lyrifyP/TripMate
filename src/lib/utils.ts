import { differenceInDays, differenceInSeconds, format, parseISO } from 'date-fns'

export function fmtDate(iso: string) { return format(parseISO(iso), 'EEE d MMM') }

export function betweenPercent(startISO: string, endISO: string, now = new Date()): number {
  const start = new Date(startISO); const end = new Date(endISO)
  const total = Math.max(1, differenceInDays(end, start))
  const used = Math.min(total, Math.max(0, differenceInDays(now, start)))
  return Math.round((used / total) * 100)
}

export function countdown(targetISO: string) {
  const now = new Date(); const target = new Date(targetISO)
  const secs = Math.max(0, differenceInSeconds(target, now))
  const d = Math.floor(secs / 86400); const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60); const s = secs % 60
  return { d, h, m, s, total: secs }
}

// lib/utils.ts
export function pctComplete(startISO?: string | null, endISO?: string | null): number {
  if (!startISO || !endISO) return 0
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  const now = Date.now()
  if (!isFinite(start) || !isFinite(end) || end <= start) return 0
  const pct = Math.round(((now - start) / (end - start)) * 100)
  return Math.max(0, Math.min(100, pct))
}

export function groupByDate<T extends { date: string }>(items: T[]) {
  const map = new Map<string, T[]>()
  for (const it of items) {
    const arr = map.get(it.date) ?? []
    arr.push(it)
    map.set(it.date, arr)
  }
  return Array.from(map.entries()).map(([date, arr]) => ({ date, items: arr }))
}
