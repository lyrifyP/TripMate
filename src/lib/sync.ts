// src/lib/sync.ts
import { supabase } from './supabase'
import type { AppState } from '../types'

export async function loadState({ tripId }: { tripId: string }): Promise<AppState | null> {
  const { data, error } = await supabase
    .from('trip_state')
    .select('state')
    .eq('trip_id', tripId)
    .maybeSingle()
  if (error) throw error
  return (data?.state as AppState) ?? null
}

export async function saveState({ tripId }: { tripId: string }, state: AppState) {
  const { error } = await supabase
    .from('trip_state')
    .upsert(
      { trip_id: tripId, state, updated_at: new Date().toISOString() },
      { onConflict: 'trip_id' } // safe if trip_id is PK/unique
    )
  if (error) throw error
}

export function subscribeState(
  { tripId }: { tripId: string },
  onChange: (state: AppState) => void
) {
  const channel = supabase
    .channel(`trip_state:${tripId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trip_state', filter: `trip_id=eq.${tripId}` },
      (payload) => {
        // INSERT or UPDATE may come through
        const next = (payload.new as any)?.state
        if (next) onChange(next as AppState)
      }
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// tiny debounce helper stays the same
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: number | undefined
  return (...args: Parameters<T>) => {
    window.clearTimeout(t)
    t = window.setTimeout(() => fn(...args), ms)
  }
}
