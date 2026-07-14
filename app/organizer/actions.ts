'use server'
// Vytvoření akce i s vlnami a promo kódy. Běží na serveru pod přihlášeným
// uživatelem → RLS povolí zápis jen jeho vlastní akce (a jen pořadateli/adminovi).
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type TierInput = {
  name: string
  description: string
  price: number
  qty: number
  end_date: string | null
}

export type PromoInput = {
  code: string
  type: 'pct' | 'fixed'
  value: number
  usage_limit: number | null
  end_date: string | null
}

export type EventInput = {
  name: string
  cat: string
  date: string
  place: string
  map: string
  organizer: string
  description: string
  image: string
  lineup: string[]
  published: boolean
  tiers: TierInput[]
  promos: PromoInput[]
}

// Rozšířené typy pro editaci — existující řádky nesou `id`, u vln navíc
// `sold` (jen pro čtení, pro pojistky v UI/serveru).
export type TierInputEdit = TierInput & { id?: string; sold?: number }
export type PromoInputEdit = PromoInput & { id?: string }

export type EventUpdateInput = Omit<EventInput, 'tiers' | 'promos'> & {
  tiers: TierInputEdit[]
  promos: PromoInputEdit[]
}

async function requireOwnerOrAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Nejsi přihlášený.' }

  const { data: ev } = await supabase.from('events').select('owner_id').eq('id', eventId).single()
  if (!ev) return { ok: false as const, error: 'Akce nenalezena.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  if (ev.owner_id !== user.id && !isAdmin) {
    return { ok: false as const, error: 'Nemáš oprávnění tuto akci upravovat.' }
  }
  return { ok: true as const, user, isOwner: ev.owner_id === user.id }
}

export async function createEvent(input: EventInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Nejsi přihlášený.' }

  // 1) samotná akce
  const { data: ev, error: e1 } = await supabase
    .from('events')
    .insert({
      owner_id: user.id,
      name: input.name,
      cat: input.cat || null,
      date: input.date || null,
      place: input.place || null,
      map: input.map || null,
      organizer: input.organizer || null,
      description: input.description || null,
      image: input.image || null,
      lineup: input.lineup,
      published: input.published,
    })
    .select('id')
    .single()

  if (e1 || !ev) {
    return {
      error:
        (e1?.message ?? 'Akci se nepodařilo vytvořit.') +
        ' — máš roli „promotér“ nebo „admin“?',
    }
  }

  // 2) vlny lístků
  if (input.tiers.length) {
    const { error: e2 } = await supabase.from('tiers').insert(
      input.tiers.map((t) => ({
        event_id: ev.id,
        name: t.name,
        description: t.description || null,
        price: t.price,
        qty: t.qty,
        end_date: t.end_date || null,
      }))
    )
    if (e2) return { error: 'Akce vytvořena, ale vlny se neuložily: ' + e2.message }
  }

  // 3) promo kódy
  if (input.promos.length) {
    const { error: e3 } = await supabase.from('promos').insert(
      input.promos.map((p) => ({
        event_id: ev.id,
        code: p.code,
        type: p.type,
        value: p.value,
        usage_limit: p.usage_limit,
        end_date: p.end_date || null,
      }))
    )
    if (e3) return { error: 'Akce vytvořena, ale promo kódy se neuložily: ' + e3.message }
  }

  revalidatePath('/')
  redirect('/')
}

// ---------------------------------------------------------------------
// EDITACE existující akce — vlny a promo kódy se "sesynchronizují":
// řádky s `id` se updatují, řádky bez `id` se vloží jako nové, řádky
// které v inputu chybí (ale v DB byly) se smažou.
// Pojistka: vlnu s prodanými lístky (sold > 0) nejde smazat ani snížit
// pod počet prodaných kusů.
// ---------------------------------------------------------------------
export async function updateEvent(eventId: string, input: EventUpdateInput) {
  const supabase = await createClient()
  const check = await requireOwnerOrAdmin(supabase, eventId)
  if (!check.ok) return { error: check.error }

  const { error: eEv } = await supabase
    .from('events')
    .update({
      name: input.name,
      cat: input.cat || null,
      date: input.date || null,
      place: input.place || null,
      map: input.map || null,
      organizer: input.organizer || null,
      description: input.description || null,
      image: input.image || null,
      lineup: input.lineup,
      published: input.published,
    })
    .eq('id', eventId)
  if (eEv) return { error: eEv.message }

  // ---- vlny ----
  const { data: existingTiers, error: eGetTiers } = await supabase
    .from('tiers')
    .select('id, sold')
    .eq('event_id', eventId)
  if (eGetTiers) return { error: 'Akce uložena, ale vlny se nepodařilo načíst: ' + eGetTiers.message }

  const keepTierIds = new Set(input.tiers.filter((t) => t.id).map((t) => t.id))
  const tiersToDelete = (existingTiers ?? []).filter((t) => !keepTierIds.has(t.id))
  const blockedTier = tiersToDelete.find((t) => (t.sold ?? 0) > 0)
  if (blockedTier) {
    return { error: 'Nejde smazat vlnu, která už má prodané lístky.' }
  }

  const soldById = new Map((existingTiers ?? []).map((t) => [t.id, t.sold ?? 0]))
  for (const t of input.tiers) {
    if (t.id) {
      const sold = soldById.get(t.id) ?? 0
      if (Number(t.qty) < sold) {
        return {
          error: `Vlna „${t.name}“ má prodáno ${sold} ks — kapacitu nejde snížit pod tento počet.`,
        }
      }
    }
  }

  if (tiersToDelete.length) {
    const { error: eDelT } = await supabase
      .from('tiers')
      .delete()
      .in('id', tiersToDelete.map((t) => t.id))
    if (eDelT) return { error: 'Nepodařilo se smazat odebrané vlny: ' + eDelT.message }
  }

  for (const t of input.tiers) {
    if (t.id) {
      const { error: eUpT } = await supabase
        .from('tiers')
        .update({
          name: t.name,
          description: t.description || null,
          price: t.price,
          qty: t.qty,
          end_date: t.end_date || null,
        })
        .eq('id', t.id)
      if (eUpT) return { error: 'Nepodařilo se uložit vlnu „' + t.name + '“: ' + eUpT.message }
    } else {
      const { error: eInsT } = await supabase.from('tiers').insert({
        event_id: eventId,
        name: t.name,
        description: t.description || null,
        price: t.price,
        qty: t.qty,
        end_date: t.end_date || null,
      })
      if (eInsT) return { error: 'Nepodařilo se přidat vlnu „' + t.name + '“: ' + eInsT.message }
    }
  }

  // ---- promo kódy ----
  const { data: existingPromos, error: eGetPromos } = await supabase
    .from('promos')
    .select('id')
    .eq('event_id', eventId)
  if (eGetPromos) return { error: 'Akce uložena, ale promo kódy se nepodařilo načíst: ' + eGetPromos.message }

  const keepPromoIds = new Set(input.promos.filter((p) => p.id).map((p) => p.id))
  const promosToDelete = (existingPromos ?? []).filter((p) => !keepPromoIds.has(p.id))
  if (promosToDelete.length) {
    const { error: eDelP } = await supabase
      .from('promos')
      .delete()
      .in('id', promosToDelete.map((p) => p.id))
    if (eDelP) return { error: 'Nepodařilo se smazat odebrané promo kódy: ' + eDelP.message }
  }

  for (const p of input.promos) {
    if (p.id) {
      const { error: eUpP } = await supabase
        .from('promos')
        .update({
          code: p.code,
          type: p.type,
          value: p.value,
          usage_limit: p.usage_limit,
          end_date: p.end_date || null,
        })
        .eq('id', p.id)
      if (eUpP) return { error: 'Nepodařilo se uložit promo kód „' + p.code + '“: ' + eUpP.message }
    } else {
      const { error: eInsP } = await supabase.from('promos').insert({
        event_id: eventId,
        code: p.code,
        type: p.type,
        value: p.value,
        usage_limit: p.usage_limit,
        end_date: p.end_date || null,
      })
      if (eInsP) return { error: 'Nepodařilo se přidat promo kód „' + p.code + '“: ' + eInsP.message }
    }
  }

  revalidatePath('/organizer')
  revalidatePath('/admin')
  revalidatePath(`/event/${eventId}`)
  redirect(check.isOwner ? '/organizer' : '/admin')
}

export async function toggleEventPublishedOrganizer(eventId: string, published: boolean) {
  const supabase = await createClient()
  const check = await requireOwnerOrAdmin(supabase, eventId)
  if (!check.ok) return { error: check.error }

  const { error } = await supabase.from('events').update({ published }).eq('id', eventId)
  if (error) return { error: error.message }

  revalidatePath('/organizer')
  return { ok: true }
}

export async function deleteEventOrganizer(eventId: string) {
  const supabase = await createClient()
  const check = await requireOwnerOrAdmin(supabase, eventId)
  if (!check.ok) return { error: check.error }

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

  revalidatePath('/organizer')
  return { ok: true }
}
