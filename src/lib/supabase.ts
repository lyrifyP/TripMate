// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// --- 1. Create client ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- 2. Ensure an auth session exists ---
export async function ensureSession() {
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    // create an anonymous session if none exists
    await supabase.auth.signInAnonymously()
  }
}
