import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminUserRow from './user-row'
import AdminEventRow from './event-row'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/')

  const [profilesRes, eventsRes, tiersRes, ticketsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, name, cat, date, published, owner_id, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('tiers').select('event_id, qty, sold'),
    supabase.from('tickets').select('paid'),
  ])

  const profiles = profilesRes.data ?? []
  const events = eventsRes.data ?? []
  const tiers = tiersRes.data ?? []
  const tickets = ticketsRes.data ?? []

  const ownerNames = new Map(profiles.map((p) => [p.id, p.name || p.email]))

  const perEvent = new Map<string, { qty: number; sold: number }>()
  for (const t of tiers) {
    const cur = perEvent.get(t.event_id) ?? { qty: 0, sold: 0 }
    cur.qty += t.qty ?? 0
    cur.sold += t.sold ?? 0
    perEvent.set(t.event_id, cur)
  }

  const totalSold = tiers.reduce((sum, t) => sum + (t.sold ?? 0), 0)
  const totalRevenue = tickets.reduce((sum, t) => sum + Number(t.paid ?? 0), 0)

  return (
    <div>
      <div className="adm-head">
        <h2>Administrace</h2>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-v">{profiles.length}</div>
          <div className="stat-l">Uživatelů</div>
        </div>
        <div className="stat">
          <div className="stat-v">{events.length}</div>
          <div className="stat-l">Akcí</div>
        </div>
        <div className="stat">
          <div className="stat-v">{totalSold}</div>
          <div className="stat-l">Prodáno lístků</div>
        </div>
        <div className="stat">
          <div className="stat-v">{totalRevenue.toLocaleString('cs-CZ')} Kč</div>
          <div className="stat-l">Tržba</div>
        </div>
      </div>

      <div className="row-h">
        <h2>Akce</h2>
        <small>{events.length}</small>
      </div>
      {events.length === 0 && (
        <div className="empty">
          <h3>Zatím žádné akce</h3>
        </div>
      )}
      {events.map((ev) => {
        const s = perEvent.get(ev.id) ?? { qty: 0, sold: 0 }
        return (
          <AdminEventRow
            key={ev.id}
            event={ev}
            ownerName={ownerNames.get(ev.owner_id) ?? '—'}
            sold={s.sold}
            qty={s.qty}
          />
        )
      })}

      <div className="row-h">
        <h2>Uživatelé</h2>
        <small>{profiles.length}</small>
      </div>
      {profiles.map((p) => (
        <AdminUserRow key={p.id} profile={p} currentUserId={user.id} />
      ))}
    </div>
  )
}
