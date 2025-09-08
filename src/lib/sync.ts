import { supabase } from './supabase'
import type { AppState } from '../types'

export type TripKey = { userId: string; tripId: string }

export async function loadState({ userId, tripId }: TripKey): Promise<AppState | null> {
  const { data, error } = await supabase
    .from('trip_state')
    .select('state')
    .eq('user_id', userId)
    .eq('trip_id', tripId)
    .maybeSingle()

  if (error) throw error
  return (data?.state as AppState) ?? null
}

export async function saveState({ userId, tripId }: TripKey, state: AppState) {
  const { error } = await supabase
    .from('trip_state')
    .upsert({ user_id: userId, trip_id: tripId, state, updated_at: new Date().toISOString() })
  if (error) throw error
}

/**
 * Realtime subscription – notifies when this trip row changes.
 * Returns an unsubscribe function.
 */
export function subscribeState(
  { userId, tripId }: TripKey,
  onChange: (state: AppState) => void
) {
  const channel = supabase
    .channel(`trip_state:${userId}:${tripId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'trip_state',
        filter: `user_id=eq.${userId},trip_id=eq.${tripId}`,
      },
      (payload: any) => {
        const next = payload.new?.state as AppState
        if (next) onChange(next)
      }
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// tiny debounce
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: number | undefined
  return (...args: Parameters<T>) => {
    window.clearTimeout(t)
    t = window.setTimeout(() => fn(...args), ms)
  }
}
