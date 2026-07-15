// Server-only Supabase klient se service_role klíčem.
//
// DŮLEŽITÉ: tenhle klient obchází RLS úplně. NIKDY ho needovat do klientské
// ('use client') komponenty ani do souboru, který se importuje do klientského
// kódu — service_role klíč by unikl do prohlížeče. Používat výhradně
// v serverových route handlerech (app/api/**/route.ts).
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
