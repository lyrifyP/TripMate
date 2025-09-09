export type NewsItem = { title: string; url: string; source?: string; publishedAt?: string }

export async function fetchNews(query?: string): Promise<NewsItem[]> {
  const q = query ? `?query=${encodeURIComponent(query)}` : ''
  const res = await fetch(`/api/news${q}`)
  if (!res.ok) throw new Error(`News route ${res.status}`)
  const json = await res.json()
  return json.items as NewsItem[]
}
