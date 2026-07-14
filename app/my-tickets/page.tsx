import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => (n || 0).toLocaleString('cs-CZ') + ' Kč'

export default async function MyTickets() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="empty">
        Nejdřív se <Link href="/login" style={{ color: 'var(--amber)' }}>přihlas</Link>.
      </div>
    )
  }

  // RLS vrátí jen lístky přihlášeného uživatele
  const { data } = await supabase
    .from('tickets')
    .select('code, event_name, event_date, tier_name, qty, paid, used')
    .order('created_at', { ascending: false })

  const tickets = data ?? []

  return (
    <>
      <p className="h-eyebrow">Moje lístky</p>
      <h1 className="h-title">Vstupenky</h1>

      {tickets.length === 0 && (
        <div className="empty">
          Zatím žádné lístky.{' '}
          <Link href="/" style={{ color: 'var(--amber)' }}>
            Objevit akce
          </Link>
        </div>
      )}

      <div className="mt-list">
        {tickets.map((t) => (
          <Link key={t.code} href={'/ticket/' + t.code} className="mt-item">
            <div>
              <strong>{t.event_name}</strong>
              <span className="meta">
                {t.tier_name} · {t.qty}× · {fmt(t.paid)}
              </span>
              {t.event_date ? <span className="meta">{t.event_date}</span> : null}
            </div>
            <span className={'mt-badge' + (t.used ? ' used' : '')}>{t.used ? 'použito' : 'platný'}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
