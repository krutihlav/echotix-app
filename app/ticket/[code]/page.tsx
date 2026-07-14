import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import TicketQR from './ticket-qr'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => (n || 0).toLocaleString('cs-CZ') + ' Kč'

export default async function TicketPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()

  const { data: t } = await supabase
    .from('tickets')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!t) {
    return (
      <div className="empty">
        <h3>Lístek nenalezen</h3>
        <p>Lístek buď neexistuje, nebo na něj nemáš přístup.</p>
        <Link
          href="/my-tickets"
          className="btn btn-line"
          style={{ marginTop: 16, display: 'inline-block' }}
        >
          Moje lístky
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link href="/my-tickets" className="back" style={{ marginBottom: 12, display: 'inline-block' }}>
        ← moje lístky
      </Link>

      <div className="pass">
        <div className="pass-top">
          <div className="eyebrow" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Echotix · vstupenka</span>
            {t.used ? (
              <span style={{ color: 'var(--ember)' }}>Použito</span>
            ) : (
              <span style={{ color: 'var(--verd)' }}>Platné</span>
            )}
          </div>
          <div className="pass-fest">{t.event_name}</div>
          <div className="pass-grid">
            <div className="cell">
              <div className="l">Držitel</div>
              <div className="v">{t.holder_name}</div>
            </div>
            <div className="cell">
              <div className="l">Typ</div>
              <div className="v">{t.tier_name}</div>
            </div>
            <div className="cell">
              <div className="l">Termín</div>
              <div className="v">{t.event_date || '—'}</div>
            </div>
            <div className="cell">
              <div className="l">Vstupů</div>
              <div className="v m">{t.qty}×</div>
            </div>
          </div>
        </div>

        <div className="pass-mid" />

        <div className="pass-bot">
          <div className="qr-wrap">
            <TicketQR code={t.code} />
          </div>
          <div className="scanhint">ID · {t.code}</div>
          <div style={{ marginTop: 12 }}>
            {t.used ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ember)' }}>
                Použito {t.used_at ? new Date(t.used_at).toLocaleString('cs-CZ') : ''}
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--verd)' }}>
                Zaplaceno {fmt(t.paid)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Link href="/my-tickets" className="btn btn-line">
          Zpět na přehled
        </Link>
      </div>
    </div>
  )
}
