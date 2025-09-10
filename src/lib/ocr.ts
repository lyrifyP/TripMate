// lib/ocr.ts
import { createWorker } from 'tesseract.js'

let _worker: any

async function getWorker() {
  if (_worker) return _worker
  // simplest: no logger (avoids TS typing quirks)
  _worker = await createWorker()
  await _worker.loadLanguage('eng')
  await _worker.initialize('eng')
  return _worker
}

export type OCRGuess = {
  amount?: number
  currency?: 'GBP' | 'THB' | 'QAR'
  dateISO?: string
  merchant?: string
  rawText: string
}

/** Run OCR on a File/Blob/URL */
export async function ocrImage(file: File | Blob | string): Promise<string> {
  const worker = await getWorker()
  const { data } = await worker.recognize(file as any)
  return (data?.text || '').replace(/\r/g, '')
}

/** Heuristic receipt parsing */
export function parseReceipt(text: string): OCRGuess {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // 1) Merchant: first strong all-capsish short-ish line
  const merchant = lines.find(l => /^[A-Z0-9&' .-]{4,}$/.test(l) && l.length < 40)

  // 2) Currency detection
  const t = text.toUpperCase()
  let currency: OCRGuess['currency'] | undefined
  if (/[£]/.test(text) || /\bGBP\b/.test(t)) currency = 'GBP'
  else if (/[฿]/.test(text) || /\bTHB\b/.test(t) || /\bBAHT\b/.test(t)) currency = 'THB'
  else if (/\bQAR\b/.test(t) || /\bQR\b/.test(t) || /\BRIYAL\b/.test(t)) currency = 'QAR'

  // 3) Date (try multiple formats)
  const dateMatch =
    t.match(/\b(20\d{2})[- /.](\d{1,2})[- /.](\d{1,2})\b/) || // YYYY-MM-DD
    t.match(/\b(\d{1,2})[- /.](\d{1,2})[- /.](20\d{2})\b/) || // DD-MM-YYYY
    t.match(/\b(\d{1,2})[- /.](\d{1,2})[- /.](\d{2})\b/)      // DD-MM-YY

  let dateISO: string | undefined
  if (dateMatch) {
    const [ , aStr, bStr, cStr ] = dateMatch
    const a = Number(aStr), b = Number(bStr), c = Number(cStr)
    if (a > 1900) {
      // yyyy-mm-dd
      dateISO = new Date(a, b - 1, c).toISOString().slice(0, 10)
    } else if (c > 1900) {
      // dd-mm-yyyy
      dateISO = new Date(c, b - 1, a).toISOString().slice(0, 10)
    } else {
      // dd-mm-yy
      const year = 2000 + c
      dateISO = new Date(year, b - 1, a).toISOString().slice(0, 10)
    }
  }

  // 4) Amount
  // Prefer labelled totals; otherwise pick the largest plausible money value.
  const moneyRegex = /(?:£|฿|QAR|QR)?\s*(\d{1,3}(?:[ ,]\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/g
  const candidates: number[] = []
  let m: RegExpExecArray | null
  while ((m = moneyRegex.exec(text)) !== null) {
    const raw = m[1]
    // normalize "1 234,56" or "1,234.56"
    const normalized = raw.replace(/(?<=\d)[ ,](?=\d{3}\b)/g, '').replace(',', '.')
    const value = parseFloat(normalized)
    if (!isNaN(value) && value > 0.2) candidates.push(value)
  }

  let amount: number | undefined
  const totalLine = lines.find(l => /\b(TOTAL|AMOUNT DUE|BALANCE DUE|GRAND TOTAL)\b/i.test(l))
  if (totalLine) {
    const m2 = totalLine.match(/(\d{1,3}(?:[ ,]\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)/)
    if (m2) amount = parseFloat(m2[1].replace(/(?<=\d)[ ,](?=\d{3}\b)/g, '').replace(',', '.'))
  }
  if (!amount && candidates.length) amount = Math.max(...candidates)

  return { amount, currency, dateISO, merchant, rawText: text }
}
