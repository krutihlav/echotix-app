import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OrganizerEventRow from './event-row'

export const dynamic = 'force-dynamic'

export default async function OrganizerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'visitor'

  if (role !== 'organizer' && role !== 'admin') {
    return (
      <div className="empty">
        Tahle stránka je jen pro pořadatele. Tvoje role je „{role}“.
      </div>
    )
  }

  const { data: events } = await supabase
    .from('events')
    .select('id, name, cat, date, published, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const eventIds = (events ?? []).map((e) => e.id)

  let tiers: { event_id: string; qty: number; sold: number }[] = []
  let tickets: { event_id: string; paid: number }[] = []
  if (eventIds.length) {
    const [tiersRes, ticketsRes] = await Promise.all([
      supabase.from('tiers').select('event_id, qty, sold').in('event_id', eventIds),
      supabase.from('tickets').select('event_id, paid').in('event_id', eventIds),
    ])
    tiers = tiersRes.data ?? []
    tickets = ticketsRes.data ?? []
  }

  const perEvent = new Map<string, { qty: number; sold: number }>()
  for (const t of tiers) {
    const cur = perEvent.get(t.event_id) ?? { qty: 0, sold: 0 }
    cur.qty += t.qty ?? 0
    cur.sold += t.sold ?? 0
    perEvent.set(t.event_id, cur)
  }

  const totalSold = tiers.reduce((sum, t) => sum + (t.sold ?? 0), 0)
  const totalCapacity = tiers.reduce((sum, t) => sum + (t.qty ?? 0), 0)
  const totalRevenue = tickets.reduce((sum, t) => sum + Number(t.paid ?? 0), 0)

  return (
    <div>
      <div className="adm-head">
        <h2>Moje akce</h2>
        <Link href="/organizer/new" className="btn btn-amber">+ Nová akce</Link>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-v">{events?.length ?? 0}</div>
          <div className="stat-l">Akcí</div>
        </div>
        <div className="stat">
          <div className="stat-v">{totalSold}/{totalCapacity}</div>
          <div className="stat-l">Prodáno / kapacita</div>
        </div>
        <div className="stat">
          <div className="stat-v">{totalRevenue.toLocaleString('cs-CZ')} Kč</div>
          <div className="stat-l">Tržba</div>
        </div>
      </div>

      {(!events || events.length === 0) && (
        <div className="empty">
          <h3>Zatím žádná akce</h3>
        </div>
      )}
      {events?.map((ev) => {
        const s = perEvent.get(ev.id) ?? { qty: 0, sold: 0 }
        return <OrganizerEventRow key={ev.id} event={ev} sold={s.sold} qty={s.qty} />
      })}
    </div>
  )
}
