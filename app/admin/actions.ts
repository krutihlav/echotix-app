'use server'
// Admin akce — vždy ověří na serveru, že volající je admin (RLS je druhá
// vrstva obrany, tohle je rychlá a srozumitelná chybová hláška do UI).
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type Role = 'visitor' | 'organizer' | 'admin'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, ok: false as const, error: 'Nejsi přihlášený.' }
  }

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') {
    return { supabase, ok: false as const, error: 'Nemáš oprávnění administrátora.' }
  }
  return { supabase, ok: true as const, user }
}

export async function setUserRole(userId: string, role: Role) {
  const check = await requireAdmin()
  if (!check.ok) return { error: check.error }

  if (userId === check.user.id && role !== 'admin') {
    return { error: 'Nemůžeš si sám sobě odebrat roli admina.' }
  }

  const { error } = await check.supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { ok: true }
}

export async function toggleEventPublished(eventId: string, published: boolean) {
  const check = await requireAdmin()
  if (!check.ok) return { error: check.error }

  const { error } = await check.supabase.from('events').update({ published }).eq('id', eventId)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { ok: true }
}

export async function deleteEventAdmin(eventId: string) {
  const check = await requireAdmin()
  if (!check.ok) return { error: check.error }
  const { supabase } = check

  // Pojistka: nedovolit smazat akci, která má prodané lístky (viz cascade
  // delete tickets.event_id v echotix_setup.sql — v aplikaci to blokujeme tvrdě).
  const { data: tiers, error: eTiers } = await supabase
    .from('tiers')
    .select('sold')
    .eq('event_id', eventId)
  if (eTiers) return { error: eTiers.message }

  const totalSold = (tiers ?? []).reduce((sum, t) => sum + (t.sold ?? 0), 0)
  if (totalSold > 0) {
    return { error: `Akci nejde smazat — má ${totalSold} prodaných lístků. Nejdřív ji skryj.` }
  }

  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { ok: true }
}
