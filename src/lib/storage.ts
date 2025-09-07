const KEY = 'tripmate-state-v1'

export function save<T>(state: T) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function load<T>(fallback: T): T {
  const raw = localStorage.getItem(KEY)
  if (!raw) return fallback
  try { return { ...fallback, ...JSON.parse(raw) } } catch { return fallback }
}

export function exportToFile(json: unknown) {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'tripmate-data.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function importFromFile(): Promise<any> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'application/json'
    input.onchange = () => {
      const f = input.files?.[0]; if (!f) return reject(new Error('No file'))
      const r = new FileReader(); r.onload = () => {
        try { resolve(JSON.parse(String(r.result))) } catch (e) { reject(e) }
      }; r.readAsText(f)
    }
    input.click()
  })
}
