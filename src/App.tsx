import React, { useEffect, useRef, useState, createContext } from 'react'
import { Home as HomeIcon, DollarSign, UtensilsCrossed, CheckSquare, Calendar } from 'lucide-react'

import TripMateLogo from './components/TripMateLogo'

import { load, save } from './lib/storage'
import { defaultRates, fetchLiveRates } from './lib/currency'
import { ensureSession } from './lib/supabase'
import { loadState as cloudLoad, saveState as cloudSave, subscribeState, debounce } from './lib/sync'

import type { AppState, Restaurant, ChecklistItem, PlanItem } from './types'

import Dashboard from './components/Dashboard'
import Budget from './components/Budget'
import Dining from './components/Dining'
import Checklist from './components/Checklist'
import Planner from './components/Planner'

// --- seed imports (JSON) ---
import restaurantsSeed from './seed/restaurants.json'
import checklistSeed from './seed/checklist.json'
import planSeed from './seed/plan.json'

// -----------------------------
// Tabs
// -----------------------------
type Tab = 'home' | 'budget' | 'dining' | 'checklist' | 'planner'

// -----------------------------
// Seed coercion → typed arrays
// -----------------------------
const restaurantsTyped: Restaurant[] = (restaurantsSeed as any[]).map((r) => ({
  ...r,
  area: r.area as 'Samui' | 'Doha',
  priceTier: r.priceTier as '£' | '££' | '£££',
}))

const checklistTyped: ChecklistItem[] = (checklistSeed as any[]).map((i) => ({
  ...i,
  area: i.area as 'Samui' | 'Doha',
  type: i.type as 'Food' | 'Activity',
}))

const planTyped: PlanItem[] = (planSeed as any[]).map((p) => ({
  ...p,
  area: p.area as 'Samui' | 'Doha',
  kind: p.kind as 'Activity' | 'Meal' | 'Note',
}))

// -----------------------------
// Default state
// -----------------------------
const DEFAULT_STATE: AppState = {
  startISO: '2025-09-16',
  endISO: '2025-09-29',
  spends: [],
  rates: defaultRates(),
  restaurants: restaurantsTyped,
  checklist: checklistTyped,
  plan: planTyped,
  specialEvents: [
    // Depart London (BST = UTC+01)
    { id: 'flight-out', label: 'Flight to Samui', atISO: '2025-09-16T08:25:00+01:00' },
    // Mid-trip hop (Samui UTC+07)
    { id: 'flight-doha', label: 'Flight to Doha', atISO: '2025-09-24T22:45:00+07:00' },
  ],
  // Added for “Steps” feature
  steps: {},
}

// -----------------------------
// Context
// -----------------------------
type Ctx = {
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>
  setActiveTab: (t: Tab) => void
}
export const AppContext = createContext<Ctx>(null as any)

// -----------------------------
// App
// -----------------------------
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')

  // local state; start with localStorage fallback so app paints fast
  const [state, setState] = useState<AppState>(() => load(DEFAULT_STATE))

  // guards to avoid save loops while hydrating from cloud
  const hydratingRef = useRef(true)
  const unsubRef = useRef<null | (() => void)>(null)

  // --- Always keep localStorage in sync (cheap, instant) ---
  useEffect(() => {
    save(state)
  }, [state])

  // --- Fetch live FX rates once on mount (unless manual override) ---
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (state.rates.manualOverride) return
        const live = await fetchLiveRates()
        if (!cancelled) {
          setState((s) => ({ ...s, rates: { ...s.rates, ...live } }))
        }
      } catch {
        // ignore FX errors, defaults still work
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once

  // --- Cloud session + initial hydrate + realtime subscription ---
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        // 1) Ensure anonymous Supabase session exists
        await ensureSession()

        // 2) Try cloud load
        const remote = await cloudLoad()

        if (cancelled) return

        if (remote) {
          // hydrate from cloud (authoritative)
          hydratingRef.current = true
          setState(remote)
          // give React a tick to apply state, then drop the guard
          setTimeout(() => {
            hydratingRef.current = false
          }, 0)
        } else {
          // nothing in cloud yet → push local (or default) up once
          hydratingRef.current = false
          await cloudSave(state).catch(() => {
            /* ignore first-save errors */
          })
        }

        // 3) Subscribe to remote changes → update local state
        unsubRef.current = subscribeState((incoming) => {
          // Avoid cross-device storms: only apply if actually different
          setState((current) => {
            try {
              const a = JSON.stringify(current)
              const b = JSON.stringify(incoming)
              if (a === b) return current
            } catch {
              // if stringify fails, just set
            }
            // When we apply remote, pause local save debounce momentarily
            hydratingRef.current = true
            const next = incoming
            // drop the guard on next tick so user edits resume saving
            setTimeout(() => {
              hydratingRef.current = false
            }, 0)
            return next
          })
        })
      } catch (e) {
        // If cloud boot fails, we silently stay on local-storage mode
        hydratingRef.current = false
      }
    })()

    return () => {
      cancelled = true
      if (unsubRef.current) {
        try {
          unsubRef.current()
        } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- Debounced cloud save whenever local state changes (and not hydrating) ---
  const debouncedCloudSave = useRef(
    debounce(async (next: AppState) => {
      try {
        await cloudSave(next)
      } catch {
        // ignore save errors; localStorage already holds the state
      }
    }, 500)
  ).current

  useEffect(() => {
    if (hydratingRef.current) return
    debouncedCloudSave(state)
  }, [state, debouncedCloudSave])

  // -----------------------------
  // Tabs
  // -----------------------------
  const tabs = [
    { id: 'home' as Tab, label: 'Home', icon: HomeIcon, component: Dashboard },
    { id: 'budget' as Tab, label: 'Budget', icon: DollarSign, component: Budget },
    { id: 'dining' as Tab, label: 'Dining', icon: UtensilsCrossed, component: Dining },
    { id: 'checklist' as Tab, label: 'Lists', icon: CheckSquare, component: Checklist },
    { id: 'planner' as Tab, label: 'Plan', icon: Calendar, component: Planner },
  ] as const

  const ActiveComponent = tabs.find((t) => t.id === activeTab)?.component || Dashboard

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <AppContext.Provider value={{ state, setState, setActiveTab }}>
      <div className="min-h-screen bg-gray-50 flex flex-col pb-16">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
          <div className="flex items-center justify-center">
            <TripMateLogo size={20} />
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-auto px-4 py-3 max-w-md w-full mx-auto">
          <ActiveComponent />
        </main>

        {/* Bottom Nav */}
        <nav className="navbar">
          <div className="max-w-md mx-auto flex justify-around">
            {tabs.map((tab) => {
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
