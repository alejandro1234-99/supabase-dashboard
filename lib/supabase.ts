import { createClient } from '@supabase/supabase-js'

// Cliente lazy para uso client-side
let _supabase: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _supabase
}

// Alias conveniente para uso client-side
export const supabase = {
  from: (...args: Parameters<ReturnType<typeof createClient>['from']>) =>
    getSupabase().from(...args),
}

// Client con service role para operaciones de admin (solo server-side)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
