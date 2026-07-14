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
        ' — máš roli „organizer“ nebo „admin“?',
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
