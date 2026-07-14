import { createClient } from '@/lib/supabase/server'
import DiscoverList from './discover-list'

export const dynamic = 'force-dynamic'

type Tier = { price: number; qty: number; sold: number }
type EventRow = {
  id: string
  name: string
  cat: string | null
  date: string | null
  place: string | null
  image: string | null
  tiers: Tier[] | null
}

export default async function Discover() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('events')
    .select('id, name, cat, date, place, image, tiers(price, qty, sold)')
    .eq('published', true)
    .order('created_at', { ascending: false })

  const rows = (data ?? []) as EventRow[]
  const events = rows.map((ev) => {
    const tiers = ev.tiers ?? []
    const prices = tiers.map((t) => t.price).filter((p) => p > 0)
    const from = prices.length ? Math.min(...prices) : 0
    const cap = tiers.reduce((s, t) => s + (t.qty || 0), 0)
    const sold = tiers.reduce((s, t) => s + (t.sold || 0), 0)
    return {
      id: ev.id,
      name: ev.name,
      cat: ev.cat,
      date: ev.date,
      place: ev.place,
      image: ev.image,
      from,
      soldOut: cap > 0 && sold >= cap,
    }
  })

  return (
    <div>
      <div className="hub">
        <div className="sub">předprodej pro každého, kdo dělá zvuk</div>
        <div className="echo">
          <span className="g g3">Echotix</span>
          <span className="g g2">Echotix</span>
          <span className="g g1">Echotix</span>
          <h1>Echotix</h1>
        </div>
        <p className="lead">
          Kup si lístek, načti ho na vstupu. Žádné papíry, žádní překupníci — jen ty, sound a
          komunita.
        </p>
      </div>

      {error ? (
        <div className="empty">
          <h3>Nepovedlo se načíst akce</h3>
          <p>Zkus prosím obnovit stránku.</p>
        </div>
      ) : (
        <DiscoverList events={events} />
      )}
    </div>
  )
}
