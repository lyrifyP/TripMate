import React, { useEffect, useState, createContext } from 'react'
import { Home as HomeIcon, DollarSign, UtensilsCrossed, CheckSquare, Calendar } from 'lucide-react'
import { load, save } from './lib/storage'
import { defaultRates, fetchLiveRates } from './lib/currency'
import type { AppState, Restaurant, ChecklistItem, PlanItem } from './types'

import Dashboard from './components/Dashboard'
import Budget from './components/Budget'
import Dining from './components/Dining'
import Checklist from './components/Checklist'
import Planner from './components/Planner'

// import JSON seeds and coerce union fields
import restaurantsSeed from './seed/restaurants.json'
import checklistSeed from './seed/checklist.json'
import planSeed from './seed/plan.json'



type Tab = 'home' | 'budget' | 'dining' | 'checklist' | 'planner'

const restaurantsTyped: Restaurant[] = (restaurantsSeed as any[]).map(r => ({
  ...r,
  area: r.area as 'Samui' | 'Doha',
  priceTier: r.priceTier as '£' | '££' | '£££',
}))

const checklistTyped: ChecklistItem[] = (checklistSeed as any[]).map(i => ({
  ...i,
  area: i.area as 'Samui' | 'Doha',
  type: i.type as 'Food' | 'Activity',
}))

const planTyped: PlanItem[] = (planSeed as any[]).map(p => ({
  ...p,
  area: p.area as 'Samui' | 'Doha',
  kind: p.kind as 'Activity' | 'Meal' | 'Note',
}))

const DEFAULT_STATE: AppState = {
  startISO: '2025-09-16',
  endISO: '2025-09-29',
  spends: [],
  rates: defaultRates(),
  restaurants: restaurantsTyped,
  checklist: checklistTyped,
  plan: planTyped,
  specialEvents: [
    // Depart London, BST is UTC+01:00 in September
    { id: 'flight-out', label: 'Flight to Samui', atISO: '2025-09-16T10:15:00+01:00' },
  
    // Move from Samui to Doha during the trip, Samui is UTC+07:00
    { id: 'flight-doha', label: 'Flight to Doha', atISO: '2025-09-25T09:45:00+07:00' },
  
    // Fly home from Doha, Doha is UTC+03:00
    { id: 'flight-back', label: 'Flight home', atISO: '2025-09-29T13:00:00+03:00' },
  ],
}

type Ctx = {
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>
  setActiveTab: (t: Tab) => void
}
export const AppContext = createContext<Ctx>(null as any)

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [state, setState] = useState<AppState>(() => load(DEFAULT_STATE))
  useEffect(() => save(state), [state])

  // ✅ ADD THIS BLOCK just below
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        if (state.rates.manualOverride) return // skip if user set override
        const live = await fetchLiveRates()
        if (!cancelled) {
          setState(s => ({ ...s, rates: { ...s.rates, ...live } }))
        }
      } catch {
        // ignore errors, keep default rates
      }
    }
    run()
    return () => { cancelled = true }
  }, []) // run once on mount

  const tabs = [
    { id: 'home' as Tab, label: 'Home', icon: HomeIcon, component: Dashboard },
    { id: 'budget' as Tab, label: 'Budget', icon: DollarSign, component: Budget },
    { id: 'dining' as Tab, label: 'Dining', icon: UtensilsCrossed, component: Dining },
    { id: 'checklist' as Tab, label: 'Lists', icon: CheckSquare, component: Checklist },
    { id: 'planner' as Tab, label: 'Plan', icon: Calendar, component: Planner },
  ] as const
  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || Dashboard

  return (
    <AppContext.Provider value={{ state, setState, setActiveTab }}>
      <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
        <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
          <div className="flex items-center justify-center">
            <h1 className="text-xl font-bold text-gray-900">TripMate</h1>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-3 max-w-md w-full mx-auto">
          <ActiveComponent />
        </main>

        <nav className="navbar">
          <div className="max-w-md mx-auto flex justify-around">
            {tabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`navbtn ${isActive ? 'navbtn-active' : 'navbtn-idle'}`}
                >
                  <Icon size={20} className="mb-1" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </AppContext.Provider>
  )
}
