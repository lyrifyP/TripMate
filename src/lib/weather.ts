// src/lib/weather.ts
import type { WeatherData, WeatherDay, WeatherHour } from '@/types'

async function fetchOpenMeteo(lat: number, lon: number, tz: string) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&timezone=${encodeURIComponent(tz)}` +
    `&forecast_days=5` +
    `&daily=temperature_2m_min,temperature_2m_max,weathercode,precipitation_probability_max,precipitation_sum` +
    `&hourly=precipitation_probability,precipitation,temperature_2m,time`
  const r = await fetch(url)
  if (!r.ok) throw new Error('weather http ' + r.status)
  return r.json()
}

function buildDays(json: any): WeatherDay[] {
  const days: WeatherDay[] = json.daily.time.map((date: string, i: number) => ({
    date,
    min: Math.round(json.daily.temperature_2m_min[i]),
    max: Math.round(json.daily.temperature_2m_max[i]),
    code: json.daily.weathercode[i],
    precipProb: json.daily.precipitation_probability_max?.[i] != null
      ? Math.max(0, Math.min(1, json.daily.precipitation_probability_max[i] / 100))
      : undefined,
    precipMm: json.daily.precipitation_sum?.[i] ?? undefined,
    hours: [], // fill below
  }))

  // group hourly into each day
  const H = json.hourly
  for (let i = 0; i < H.time.length; i++) {
    const tISO = H.time[i]                    // already timezone adjusted per request
    const date = tISO.slice(0, 10)
    const hour: WeatherHour = {
      timeISO: tISO,
      precipProb: H.precipitation_probability?.[i] != null ? H.precipitation_probability[i] / 100 : undefined,
      precipMm: H.precipitation?.[i] ?? undefined,
      tempC: H.temperature_2m?.[i] ?? undefined,
    }
    const bucket = days.find(d => d.date === date)
    if (bucket) bucket.hours!.push(hour)
  }

  return days
}

export async function getWeatherData(tz = 'Europe/London'): Promise<WeatherData> {
  const [samuiJ, dohaJ] = await Promise.all([
    fetchOpenMeteo(9.512, 100.013, tz),
    fetchOpenMeteo(25.285, 51.531, tz),
  ])
  return {
    samui: buildDays(samuiJ),
    doha: buildDays(dohaJ),
  }
}
