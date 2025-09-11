// src/components/RestaurantSwipeCard.tsx
import React, { useContext, useMemo, useState } from 'react'
import SwipeChooser from '@/components/SwipeChooser'
import { AppContext } from '@/App'

export default function RestaurantSwipeCard() {
  const { state, setState } = useContext(AppContext)
  const [last, setLast] = useState<{ id: string, choice: 'yes'|'no' } | null>(null)

  // show non favourites, you can also filter by area if you like
  const items = useMemo(() =>
    state.restaurants
      .filter(r => !r.favourite)
      .map(r => ({
        id: r.id,
        title: r.name,
        subtitle: `${r.cuisine} • ${r.priceTier} • ${r.area}`,
        meta: r.proximity || '',
        imageUrl: r.imageUrl, // optional in your types
      })),
  [state.restaurants])

  function onChoice(choice: 'yes' | 'no', item: { id: string }) {
    setLast({ id: item.id, choice })
    if (choice === 'yes') {
      setState(s => ({
        ...s,
        restaurants: s.restaurants.map(r =>
          r.id === item.id ? { ...r, favourite: true } : r
        ),
      }))
    } else {
      // optional, track skips in memory only
      // setState(s => ({ ...s, steps: { ...s.steps, ['skip:'+item.id]: 1 } }))
      console.log('Skipped', item.id)
    }
  }

  // simple undo for the last Yes
  function undo() {
    if (!last || last.choice !== 'yes') return
    setState(s => ({
      ...s,
      restaurants: s.restaurants.map(r =>
        r.id === last.id ? { ...r, favourite: false } : r
      ),
    }))
    setLast(null)
  }

  return (
    <div className="space-y-2">
      <SwipeChooser
        items={items}
        onChoice={onChoice}
        title="Pick places to try"
        emptyText="No more places to rate"
      />
      {last?.choice === 'yes' && (
        <button onClick={undo} className="w-full px-3 py-2 rounded-xl bg-gray-200 text-gray-800 text-sm">
          Undo last Yes
        </button>
      )}
    </div>
  )
}
