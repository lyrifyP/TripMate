// src/lib/sync.ts
import { supabase } from './supabase'
import type { AppState } from '../types'

export type TripKey = { userId: string; tripId: string }

// ---------- ID helpers (persisted locally) ----------
const UID_KEY = 'tripmate.userId.v1'
const TID_KEY = 'tripmate.tripId.v1'

// quick UUID
function uuid() {
  // fine for client-side ids
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getOrCreateUserId(): string {
  let id = localStorage.getItem(UID_KEY)
  if (!id) {
    id = uuid()
    localStorage.setItem(UID_KEY, id)
  }
  return id
}

export function getOrCreateTripId(): string {
  let id = localStorage.getItem(TID_KEY)
  if (!id) {
    id = uuid()
    localStorage.setItem(TID_KEY, id)
  }
  return id
}

export const makeKey = (userId: string, tripId: string): TripKey => ({ userId, tripId })

// ---------- Core cloud ops (TripKey form) ----------
export async function loadState(key: TripKey): Promise<AppState | null> {
  const { userId, tripId } = key
  const { data, error } = await supabase
    .from('trip_state')
    .select('state')
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .maybeSingle()

  if (error) throw error
  return (data?.state as AppState) ?? null
}

export async function saveState(key: TripKey, state: AppState) {
  const { userId, tripId } = key
  const { error } = await supabase
    .from('trip_state')
    .upsert({
      user_id: userId,
      trip_id: tripId,
      state,
      updated_at: new Date().toISOString(),
    })
  if (error) throw error
}

/**
 * Realtime subscription – notifies when this trip row changes.
 * Returns an unsubscribe function.
 */
export function subscribeState(key: TripKey, onChange: (state: AppState) => void) {
  const { userId, tripId } = key

  const channel = supabase
    .channel(`trip_state:${userId}:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',                 // INSERT/UPDATE/DELETE
        schema: 'public',
        table: 'trip_state',
        filter: `trip_id=eq.${tripId}`, // single filter is supported; guard user_id below
      },
      (payload: any) => {
        const row = payload.new ?? payload.old
        if (!row) return
        if (row.user_id !== userId) return // ensure it's our user
        if (payload.eventType === 'DELETE') return
        const next = row.state as AppState
        if (next) onChange(next)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ---------- Convenience “by id” wrappers (optional) ----------
export const loadStateByIds = (userId: string, tripId: string) =>
  loadState({ userId, tripId })

export const saveStateByIds = (userId: string, tripId: string, state: AppState) =>
  saveState({ userId, tripId }, state)

export const subscribeStateByIds = (
  userId: string,
  tripId: string,
  onChange: (state: AppState) => void
) => subscribeState({ userId, tripId }, onChange)

// ---------- Tiny debounce ----------
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: number | undefined
  return (...args: Parameters<T>) => {
    window.clearTimeout(t)
    t = window.setTimeout(() => fn(...args), ms)
  }
}
