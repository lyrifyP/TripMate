export type Area = 'Samui' | 'Doha'
export type Currency = 'GBP' | 'THB' | 'QAR'

export type Rates = {
  GBP: number
  THB: number
  QAR: number
  lastUpdatedISO?: string
  manualOverride?: boolean
}

export type Spend = {
  id: string
  date: string          // yyyy-mm-dd
  area: Area
  label: string
  currency: Currency
  amount: number
  notes?: string
}

export type Restaurant = {
  id: string
  name: string
  area: Area
  cuisine: string
  priceTier: '£' | '££' | '£££'
  tags: string[]
  googleMapsUrl: string
  approxCostGBP?: number
  proximity?: string
  favourite?: boolean
}

export type ChecklistItem = {
  id: string
  area: Area
  type: 'Food' | 'Activity'
  label: string
  done: boolean
}

export type PlanItem = {
  id: string
  date: string          // yyyy-mm-dd
  area: Area
  time?: string         // HH:mm
  kind: 'Activity' | 'Meal' | 'Note'
  title: string
  notes?: string
}

export type WeatherDay = { date: string; min: number; max: number; code: number }
export type WeatherData = { samui: WeatherDay[]; doha: WeatherDay[]; error?: string }

export type AppState = {
  startISO: string
  endISO: string
  spends: Spend[]
  rates: Rates
  restaurants: Restaurant[]
  checklist: ChecklistItem[]
  plan: PlanItem[]
  specialEvents: { id: string, label: string, atISO: string }[]
}
