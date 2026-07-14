import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Checkout from './checkout'

export const dynamic = 'force-dynamic'

type Tier = {
  id: string
  name: string
  description: string | null
  price: number
  qty: number
  sold: number
  end_date: string | null
}

export default async function EventDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: ev } = await supabase
    .from('events')
    .select(
      'id, name, cat, date, place, map, organizer, description, image, lineup, ' +
        'tiers(id, name, description, price, qty, sold, end_date)'
    )
    .eq('id', id)
    .single()

  if (!ev) {
    return (
      <div className="empty">
        <h3>Akce nenalezena</h3>
        <p>Akce buď neexistuje, nebo není publikovaná.</p>
        <Link
          href="/"
          className="btn btn-line"
          style={{ marginTop: 16, display: 'inline-block' }}
        >
          Zpět na Objevit
        </Link>
      </div>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tiers = (ev.tiers ?? []) as Tier[]
  const lineup = (ev.lineup ?? []) as string[]

  return (
    <div>
      <Link href="/" className="back" style={{ marginBottom: 12, display: 'inline-block' }}>
        ← všechny akce
      </Link>

      {ev.image ? (
        <div
          className="ev-hero-img"
          style={{ backgroundImage: `url('${ev.image}')` }}
        />
      ) : null}

      <div className="ev-hero">
        {ev.cat ? (
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 12,
              letterSpacing: '.28em',
              textTransform: 'uppercase',
              color: 'var(--bone-dim)',
            }}
          >
            {ev.cat}
          </div>
        ) : null}

        <div className="echo" style={{ marginTop: 10 }}>
          <span className="g g3">{ev.name}</span>
          <span className="g g2">{ev.name}</span>
          <span className="g g1">{ev.name}</span>
          <h1>{ev.name}</h1>
        </div>

        <div className="meta-line">
          <span>
            <span className="k">◈</span> {ev.date || 'termín brzy'}
          </span>
          <span>
            <span className="k">◈</span>{' '}
            {ev.map ? (
              <a href={ev.map} target="_blank" rel="noreferrer" style={{ color: 'var(--amber)' }}>
                {ev.place || 'místo'} ↗
              </a>
            ) : (
              ev.place || 'místo brzy'
            )}
          </span>
        </div>

        {lineup.length > 0 && (
          <div className="chips">
            {lineup.map((l, i) => (
              <span key={i} className={'chip' + (i === 0 ? ' hi' : '')}>
                {l}
              </span>
            ))}
          </div>
        )}

        {ev.description ? <p className="ev-desc">{ev.description}</p> : null}
      </div>

      <Checkout
        eventId={ev.id}
        eventName={ev.name}
        tiers={tiers}
        isLoggedIn={!!user}
        defaultName={(user?.user_metadata?.name as string) || ''}
        defaultEmail={user?.email || ''}
      />

      <div
        style={{
          textAlign: 'center',
          marginTop: 26,
          fontFamily: 'var(--mono)',
          fontSize: 11,
          letterSpacing: '.18em',
          textTransform: 'uppercase',
          color: 'var(--bone-dim)',
        }}
      >
        pořádá {ev.organizer || '—'} · přes <span style={{ color: 'var(--amber)' }}>Echotix</span>
      </div>
    </div>
  )
}
