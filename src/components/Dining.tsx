import React, { useContext, useMemo, useState } from 'react'
import { AppContext } from '../App'
import type { Area, Restaurant } from '../types'
import { convert, formatGBP } from '../lib/currency'
import {
  Utensils,
  Heart,
  HeartOff,
  MapPin,
  Tags,
  Star,
  Search,
} from 'lucide-react'

type Filter = {
  area: 'All' | Area
  price: 'All' | '£' | '££' | '£££'
  cuisine: 'All' | string
  tag: 'All' | string
  favOnly: boolean
  q: string
}

export default function Dining() {
  const { state, setState } = useContext(AppContext)

  // Filters
  const [filter, setFilter] = useState<Filter>({
    area: 'All',
    price: 'All',
    cuisine: 'All',
    tag: 'All',
    favOnly: false,
    q: '',
  })

  // Build option lists from current data
  const cuisines = useMemo(() => {
    const s = new Set<string>()
    state.restaurants.forEach(r => r.cuisine && s.add(r.cuisine))
    return ['All', ...Array.from(s).sort()]
  }, [state.restaurants])

  const tags = useMemo(() => {
    const s = new Set<string>()
    state.restaurants.forEach(r => r.tags?.forEach(t => s.add(t)))
    return ['All', ...Array.from(s).sort()]
  }, [state.restaurants])

  // Filtered list
  const list = useMemo(() => {
    const q = filter.q.trim().toLowerCase()
    return state.restaurants
      .filter(r => filter.area === 'All' ? true : r.area === filter.area)
      .filter(r => filter.price === 'All' ? true : r.priceTier === filter.price)
      .filter(r => filter.cuisine === 'All' ? true : r.cuisine === filter.cuisine)
      .filter(r => filter.tag === 'All' ? true : r.tags?.includes(filter.tag))
      .filter(r => filter.favOnly ? r.favourite === true : true)
      .filter(r => q ? `${r.name} ${r.cuisine} ${r.tags?.join(' ')}`.toLowerCase().includes(q) : true)
      .sort((a, b) => {
        // Favourites first, then by area, then by name
        if ((b.favourite ? 1 : 0) - (a.favourite ? 1 : 0) !== 0) {
          return (b.favourite ? 1 : 0) - (a.favourite ? 1 : 0)
        }
        if (a.area !== b.area) return a.area < b.area ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [state.restaurants, filter])

  function toggleFav(id: string) {
    setState(s => ({
      ...s,
      restaurants: s.restaurants.map(r => r.id === id ? { ...r, favourite: !r.favourite } : r)
    }))
  }

  function addCurated() {
    const picks = curatedRestaurants()
    setState(s => {
      const existing = new Set(s.restaurants.map(r => r.id))
      const merged = [...s.restaurants, ...picks.filter(p => !existing.has(p.id))]
      return { ...s, restaurants: merged }
    })
  }

  return (
    <div className="space-y-4">
      {/* Gradient header, overflow hidden to avoid horizontal scroll on small screens */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg overflow-hidden">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Utensils size={18} /> Dining
          </h2>
          <button className="rounded-xl bg-white/15 px-3 py-1 text-sm backdrop-blur" onClick={addCurated}>
            Add curated picks
          </button>
        </div>
        <p className="mt-2 text-white/90 text-sm">
          Hand picked for Samui and Doha, favourites bubble to the top
        </p>

        {/* Quick filter row */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative min-w-0">
            <span className="absolute left-2 top-2.5 opacity-80"><Search size={16} /></span>
            <input
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/10 placeholder-white/70 text-white border border-white/20"
              placeholder="Search restaurant or tag"
              value={filter.q}
              onChange={e => setFilter(f => ({ ...f, q: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              className={'px-3 py-1 rounded-lg text-sm ' + (filter.area === 'All' ? 'bg-white/20' : 'bg-white/10')}
              onClick={() => setFilter(f => ({ ...f, area: f.area === 'All' ? 'Samui' : f.area === 'Samui' ? 'Doha' : 'All' }))}
              title="Cycle area"
            >
              {filter.area === 'All' ? 'All areas' : filter.area}
            </button>
            <button
              className={'px-3 py-1 rounded-lg text-sm ' + (filter.favOnly ? 'bg-white/20' : 'bg-white/10')}
              onClick={() => setFilter(f => ({ ...f, favOnly: !f.favOnly }))}
              title="Show favourites only"
            >
              {filter.favOnly ? 'Favourites' : 'All'}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-1 text-sm"
              value={filter.price}
              onChange={e => setFilter(f => ({ ...f, price: e.target.value as Filter['price'] }))}
            >
              <option value="All">All prices</option>
              <option value="£">£</option>
              <option value="££">££</option>
              <option value="£££">£££</option>
            </select>
            <select
              className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-1 text-sm"
              value={filter.cuisine}
              onChange={e => setFilter(f => ({ ...f, cuisine: e.target.value as Filter['cuisine'] }))}
            >
              {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              className="flex-1 rounded-lg bg-white/10 border border-white/20 px-3 py-1 text-sm"
              value={filter.tag}
              onChange={e => setFilter(f => ({ ...f, tag: e.target.value as Filter['tag'] }))}
            >
              {tags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {list.length === 0 ? (
        <div className="card p-4 text-sm text-gray-600">
          No restaurants match these filters. Try widening the search.
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map(r => (
            <RestaurantCard key={r.id} r={r} toggleFav={toggleFav} />
          ))}
        </div>
      )}
    </div>
  )
}

function RestaurantCard({ r, toggleFav }: { r: Restaurant, toggleFav: (id: string) => void }) {
  const { state } = useContext(AppContext)
  const local = r.area === 'Samui' ? 'THB' as const : 'QAR' as const
  const approxLocal = typeof r.approxCostGBP === 'number'
    ? Math.round(convert(r.approxCostGBP, 'GBP', local, state.rates))
    : null

  return (
    <div className="rounded-2xl border border-gray-200 p-3 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{r.name}</span>
            <span className={'text-xs px-2 py-0.5 rounded-full ' + (r.area === 'Samui' ? 'bg-orange-50 text-orange-700' : 'bg-cyan-50 text-cyan-700')}>
              {r.area}
            </span>
            <span className="text-xs text-gray-500">{r.priceTier}</span>
          </div>
          <div className="text-xs text-gray-600 mt-0.5 flex items-center gap-2 flex-wrap">
            <Tags size={14} />
            <span>{r.cuisine}</span>
            {r.tags?.length ? <span className="text-gray-400">,</span> : null}
            {r.tags?.slice(0, 4).map(t => (
              <span key={t} className="inline-block rounded-lg bg-gray-100 px-2 py-0.5">{t}</span>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
            <MapPin size={14} />
            <span>{r.proximity ?? 'See map for details'}</span>
          </div>
          {typeof r.approxCostGBP === 'number' && (
            <div className="text-xs text-gray-700 mt-1 flex items-center gap-2">
              <Star size={14} />
              <span>
                About {formatGBP(r.approxCostGBP)}
                {approxLocal ? `, approx ${approxLocal.toLocaleString()} ${local}` : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <a
            href={r.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-gray-100 px-3 py-1 text-xs hover:bg-gray-200"
          >
            Open Maps
          </a>
          <button
            className="rounded-xl px-2 py-1 text-xs"
            onClick={() => toggleFav(r.id)}
            aria-label="Toggle favourite"
            title="Toggle favourite"
          >
            {r.favourite ? <Heart size={16} className="text-rose-600" /> : <HeartOff size={16} className="text-gray-500" />}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Curated list for Samui and Doha, tweak as you like.
 * Run once with the button, duplicates are skipped by id.
 */
function curatedRestaurants(): Restaurant[] {
  const m = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
  const make = (
    id: string,
    name: string,
    area: Area,
    cuisine: string,
    priceTier: '£' | '££' | '£££',
    tags: string[],
    proximity: string,
    approxCostGBP?: number
  ): Restaurant => ({
    id,
    name,
    area,
    cuisine,
    priceTier,
    tags,
    googleMapsUrl: m(`${name} ${area}`),
    proximity,
    approxCostGBP,
    favourite: false,
  })

  return [
    // Koh Samui
    make('samui-view', 'The View Dining', 'Samui', 'Mediterranean fusion', '£££',
      ['fine dining', 'on-site', 'romantic'], 'On-site', 110),
    make('samui-ranch', 'The Ranch', 'Samui', 'Steakhouse', '£££',
      ['upscale', 'on-site'], 'On-site', 120),
    make('samui-longdtai', 'Long Dtai', 'Samui', 'Southern Thai', '£££',
      ['chef led', 'cape fahn', 'date night'], '15 to 20 minutes', 140),
    make('samui-cliff', 'The Cliff Bar & Grill', 'Samui', 'Mediterranean Italian', '££',
      ['sea view'], '25 to 30 minutes', 90),
    make('samui-chezfrancois', 'Chez François', 'Samui', 'French bistro', '££',
      ['fisherman village'], '10 to 15 minutes', 75),
    make('samui-ran-khang-non', 'Ran Khang Non', 'Samui', 'Northern Thai', '£',
      ['hidden gem', 'family run', 'local'], '10 to 15 minutes', 15),
    make('samui-ran-lan-saka', 'Ran Lan Saka', 'Samui', 'Southern Thai curries', '£',
      ['roadside', 'very cheap'], '20 to 25 minutes', 5),
    make('samui-la-brisa', 'La Brisa', 'Samui', 'Seafood small plates', '££',
      ['beachfront', 'fisherman village'], '15 to 20 minutes', 22),
    make('samui-raan-kao-hom', 'Raan Kao Hom', 'Samui', 'Home-style Thai', '£',
      ['comfort food', 'budget'], '20 to 25 minutes', 6),
    make('samui-pa-yang', 'Pa Yang Restaurant', 'Samui', 'Isan grill and som tam', '£',
      ['grilled chicken', 'local'], '15 to 20 minutes', 6),

    // Doha
    make('doha-al-aker', 'Al Aker Sweets', 'Doha', 'Middle Eastern sweets', '£',
      ['kunafa', 'desserts'], 'Multiple branches', 10),
    make('doha-bandar-aden', 'Bandar Aden Restaurant', 'Doha', 'Yemeni', '£',
      ['mandi', 'value'], 'Souq Waqif', 28),
    make('doha-kabab-al-tayab', 'Kabab Al Tayab', 'Doha', 'Grillhouse', '£',
      ['kebabs'], 'Souq Waqif', 20),
    make('doha-turkey-central', 'Turkey Central Restaurant', 'Doha', 'Turkish grills', '£',
      ['mezze', 'popular'], 'Al Nasr', 22),
    make('doha-mashawi-al-arabi', 'Mashawi Al Arabi', 'Doha', 'Arabic grills and breads', '£',
      ['casual'], 'Al Mansoura', 18),
    make('doha-bayt-sharq', 'Bayt Sharq', 'Doha', 'Traditional Qatari', '££',
      ['heritage', 'courtyard'], 'Msheireb area', 55),
    make('doha-saasna', 'Saasna', 'Doha', 'Contemporary Qatari', '££',
      ['msheireb'], 'Msheireb Downtown', 65),
    make('doha-sugar-and-spice', 'Sugar and Spice', 'Doha', 'Cakes and brunch', '£',
      ['aspire park', 'desserts'], 'Aspire Park', 16),
    make('doha-chac-late', 'Chac’Late', 'Doha', 'Pastry and chocolate', '££',
      ['katara'], 'Katara area', 24),
  ]
}
