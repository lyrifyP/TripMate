import React, { useContext, useMemo, useState } from 'react'
import { AppContext } from '../App'
import type { Area, Restaurant } from '../types'

export default function Dining() {
  const { state, setState } = useContext(AppContext)
  const [q, setQ] = useState('')
  const [area, setArea] = useState<'All'|Area>('All')
  const [cuisine, setCuisine] = useState('All')
  const [price, setPrice] = useState<'All'|'£'|'££'|'£££'>('All')
  const cuisines = Array.from(new Set(state.restaurants.map(r => r.cuisine))).sort()

  const filtered = useMemo(() => {
    return state.restaurants.filter(r => {
      if (area !== 'All' && r.area !== area) return false
      if (cuisine !== 'All' && r.cuisine !== cuisine) return false
      if (price !== 'All' && r.priceTier !== price) return false
      if (q && !r.name.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [state.restaurants, q, area, cuisine, price])

  function toggleFav(id: string) {
    setState(s => ({ ...s, restaurants: s.restaurants.map(r => r.id === id ? { ...r, favourite: !r.favourite } : r) }))
  }
  function addEmpty() {
    const name = prompt('Restaurant name'); if (!name) return
    setState(s => ({ ...s, restaurants: [...s.restaurants, {
      id: crypto.randomUUID(), name, area: 'Samui', cuisine: 'Thai', priceTier: '££', tags: [], googleMapsUrl: 'https://maps.google.com'
    }] }))
  }

  return (
    <div className="space-y-3">
      <div className="card-lg grid grid-cols-2 gap-2">
        <input className="card col-span-2" placeholder="Search by name" value={q} onChange={e => setQ(e.target.value)} />
        <select className="card" value={area} onChange={e => setArea(e.target.value as any)}>
          <option>All</option><option>Samui</option><option>Doha</option>
        </select>
        <select className="card" value={cuisine} onChange={e => setCuisine(e.target.value)}>
          <option>All</option>{cuisines.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="card" value={price} onChange={e => setPrice(e.target.value as any)}>
          <option>All</option><option>£</option><option>££</option><option>£££</option>
        </select>
        <button className="tile" onClick={addEmpty}>Add</button>
      </div>

      <div className="space-y-2">
        {filtered.map(r => <RestaurantRow key={r.id} r={r} onFav={() => toggleFav(r.id)} />)}
        {filtered.length === 0 && <p className="text-sm text-gray-600">No restaurants found</p>}
      </div>
    </div>
  )
}

function RestaurantRow({ r, onFav }: { r: Restaurant, onFav: () => void }) {
  return (
    <div className="border border-gray-200 rounded-2xl p-3 bg-white">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{r.name}</div>
        <button className="tile" onClick={onFav}>{r.favourite ? 'Unfavourite' : 'Favourite'}</button>
      </div>
      <div className="text-sm text-gray-600">{r.cuisine} • {r.priceTier} • {r.area} {r.proximity ? `• ${r.proximity}` : ''}</div>
      {r.approxCostGBP && <div className="text-sm">Approx {r.approxCostGBP.toFixed(0)} GBP</div>}
      {r.tags?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{r.tags.map(t => <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{t}</span>)}</div>}
      <div className="mt-2">
        <a className="tile w-full text-center" href={r.googleMapsUrl} target="_blank" rel="noreferrer">Open in Google Maps</a>
      </div>
    </div>
  )
}
