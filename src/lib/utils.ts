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
