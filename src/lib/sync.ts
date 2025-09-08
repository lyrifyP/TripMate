// src/lib/sync.ts
import { supabase } from './supabase'
import type { AppState } from '../types'

/**
 * We key each trip's state by a single tripId string.
 * The table schema in Supabase should look like:
 *
 * create table public.trip_state (
 *   trip_id text primary key,
 *   state jsonb not null,
 *   updated_at timestamptz not null default now()
 * );
 *
 * -- Enable Realtime
 * alter publication supabase_realtime add table public.trip_state;
 */
export type TripKey = { tripId: string }

/** Load the whole app state for a given tripId (or null if not found). */
export async function loadState({ tripId }: TripKey): Promise<AppState | null> {
  const { data, error } = await supabase
    .from('trip_state')
    .select('state')
    .eq('trip_id', tripId)
    .maybeSingle()

  if (error) throw error
  return (data?.state as AppState) ?? null
}

/** Upsert the whole app state for a given tripId. */
export async function saveState({ tripId }: TripKey, state: AppState): Promise<void> {
  const { error } = await supabase
    .from('trip_state')
    .upsert({
      trip_id: tripId,
      state,
      updated_at: new Date().toISOString(),
    })

  if (error) throw error
}

/**
 * Subscribe to realtime updates for a specific tripId.
 * Calls onChange with the latest state whenever the row is inserted/updated.
 * Returns an unsubscribe function.
 */
export function subscribeState(
  { tripId }: TripKey,
  onChange: (state: AppState) => void
) {
  const channel = supabase
    .channel(`trip_state:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: '*',                   // listen to INSERT/UPDATE/DELETE (we care about upserts/updates)
        schema: 'public',
        table: 'trip_state',
        filter: `trip_id=eq.${tripId}`,
      },
      (payload: any) => {
        // For INSERT/UPDATE, payload.new contains the new row
        const next = payload?.new?.state as AppState | undefined
        if (next) onChange(next)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/** Tiny debounce helper to limit save frequency. */
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: number | undefined
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t)
    t = window.setTimeout(() => fn(...args), ms)
  }
}
