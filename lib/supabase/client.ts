import { createBrowserClient } from '@supabase/ssr'

// Pozn.: pokud tenhle soubor v projektu už máte (standardní součást
// @supabase/ssr setupu vedle lib/supabase/server.ts), nepřepisujte ho —
// jen zkontrolujte, že export a cesta odpovídají tomu, co používá zbytek appky.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
