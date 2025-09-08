import React, { useEffect, useMemo, useState, createContext } from 'react'
import { Home as HomeIcon, DollarSign, UtensilsCrossed, CheckSquare, Calendar } from 'lucide-react'
import { load as loadLocal, save as saveLocal } from './lib/storage'
import { defaultRates, fetchLiveRates } from './lib/currency'
import type { AppState, Restaurant, ChecklistItem, PlanItem } from './types'

import TripMateLogo from './components/TripMateLogo'
import Dashboard from './components/Dashboard'
import Budget from './components/Budget'
import Dining from './components/Dining'
import Checklist from './components/Checklist'
import Planner from './components/Planner'

// ✅ Cloud sync helpers (Option A)
import {
  getOrCreateUserId,
  getOrCreateTripId,
  loadState as cloudLoad,
  saveState as cloudSave,
  subscribeState,
  debounce,
  makeKey,
} from './lib/sync'

// seeds
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
    { id: 'flight-out', label: 'Flight to Samui', atISO: '2025-09-16T08:25:00+01:00' },
    { id: 'flight-doha', label: 'Flight to Doha', atISO: '2025-09-24T22:45:00+07:00' },
  ],
  steps: {},
}

type Ctx = {
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>
  setActiveTab: (t: Tab) => void
}
export const AppContext = createContext<Ctx>(null as any)

// feature flag so you can disable cloud quickly if needed
const CLOUD_SYNC = true

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')

  // ✅ create or reuse ids ONCE (no deps)
  const userId = useMemo(() => getOrCreateUserId(), [])
  const tripId = useMemo(() => getOrCreateTripId(), [])
  const tripKey = useMemo(() => makeKey(userId, tripId), [userId, tripId])

  // load initial local state
  const [state, setState] = useState<AppState>(() => loadLocal(DEFAULT_STATE))

  // persist to local storage on any state change (always keep this)
  useEffect(() => { saveLocal(state) }, [state])

  // get live rates once on mount (skip if manual override)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (state.rates.manualOverride) return
        const live = await fetchLiveRates()
        if (!cancelled) {
          setState(s => ({ ...s, rates: { ...s.rates, ...live, lastUpdatedISO: new Date().toISOString() } }))
        }
      } catch {
        // ignore
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once

  // ---------- Cloud sync (Option A) ----------
  // 1) On mount, try to load from cloud; if present, adopt it
  useEffect(() => {
    if (!CLOUD_SYNC) return
    let cancelled = false
    ;(async () => {
      try {
        const remote = await cloudLoad(tripKey)
        if (!cancelled && remote) {
          setState(remote)
        }
      } catch (err) {
        console.warn('Cloud load failed:', err)
      }
    })()
    return () => { cancelled = true }
  }, [tripKey])

  // 2) Subscribe to remote changes for this trip and merge them in
  useEffect(() => {
    if (!CLOUD_SYNC) return
    // subscription pushes the whole state row; adopt it
    const unsubscribe = subscribeState(tripKey, (next) => {
      setState(next)
    })
    return () => unsubscribe()
  }, [tripKey])

  // 3) Debounced push to cloud whenever state changes locally
  const debouncedCloudSave = useMemo(
    () => debounce((key: { userId: string; tripId: string }, s: AppState) => {
      cloudSave(key, s).catch(err => console.warn('Cloud save failed:', err))
    }, 800),
    []
  )
  useEffect(() => {
    if (!CLOUD_SYNC) return
    debouncedCloudSave(tripKey, state)
  }, [state, tripKey, debouncedCloudSave])
  // ---------- /Cloud sync ----------

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
            <TripMateLogo size={20} />
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
