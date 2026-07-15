'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'
import PaymentStep from '@/components/checkout/payment-step'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Tier = {
  id: string
  name: string
  description: string | null
  price: number
  qty: number
  sold: number
  end_date: string | null
}

const fmt = (n: number) => (n || 0).toLocaleString('cs-CZ') + ' Kč'
const MAX_PER_ORDER = 10

export default function Checkout({
  eventId,
  eventName,
  tiers,
  isLoggedIn,
  defaultName,
  defaultEmail,
}: {
  eventId: string
  eventName: string
  tiers: Tier[]
  isLoggedIn: boolean
  defaultName: string
  defaultEmail: string
}) {
  const router = useRouter()
  const supabase = createClient()

  const [openTierId, setOpenTierId] = useState<string | null>(null)
  const openTier = tiers.find((t) => t.id === openTierId) || null

  const [qty, setQty] = useState(1)
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)

  const [promo, setPromo] = useState('')
  const [discount, setDiscount] = useState(0)
  const [promoOk, setPromoOk] = useState(false)
  const [promoNote, setPromoNote] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Jakmile server vytvoří Stripe PaymentIntent, přepneme modal do platebního kroku.
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const left = openTier ? openTier.qty - openTier.sold : 0
  const base = (openTier?.price ?? 0) * qty
  const total = Math.max(0, base - (promoOk ? discount : 0))

  function resetPromo() {
    setPromo('')
    setDiscount(0)
    setPromoOk(false)
    setPromoNote(null)
  }

  function open(t: Tier) {
    setOpenTierId(t.id)
    setQty(1)
    setName(defaultName)
    setEmail(defaultEmail)
    resetPromo()
    setError(null)
    setClientSecret(null)
  }

  function close() {
    setOpenTierId(null)
    setClientSecret(null)
  }

  function changeQty(d: number) {
    const cap = Math.min(left, MAX_PER_ORDER)
    setQty((q) => Math.max(1, Math.min(q + d, cap)))
    if (promoOk || promoNote) resetPromo()
  }

  async function applyPromo() {
    setPromoNote(null)
    setPromoOk(false)
    setDiscount(0)
    if (!promo.trim() || !openTier) return
    const { data, error } = await supabase.rpc('preview_promo', {
      p_event_id: eventId,
      p_code: promo.trim(),
      p_base: base,
    })
    if (error) {
      setPromoNote('Kód se nepodařilo ověřit.')
      return
    }
    if (data?.ok) {
      setDiscount(Number(data.discount) || 0)
      setPromoOk(true)
      setPromoNote('Sleva ' + fmt(Number(data.discount)) + ' uplatněna.')
    } else {
      setPromoNote(data?.reason || 'Kód neplatí.')
    }
  }

  async function startPayment() {
    if (!openTier) return
    if (!name.trim() || !email.trim()) {
      setError('Doplň jméno a e-mail.')
      return
    }
    setBusy(true)
    setError(null)

    const res = await fetch('/api/checkout/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        tier_id: openTier.id,
        qty,
        promo_code: promoOk ? promo.trim() : null,
        holder_name: name.trim(),
        holder_email: email.trim(),
      }),
    })
    const data = await res.json()
    setBusy(false)

    if (!res.ok) {
      setError(data.error || 'Něco se pokazilo, zkus to znovu.')
      return
    }

    if (data.free) {
      router.push('/ticket/' + data.code)
      return
    }

    setClientSecret(data.client_secret)
  }

  return (
    <>
      <div className="row-h">
        <h2>Chytni si vlnu</h2>
        <small>
          {tiers.length} {tiers.length === 1 ? 'typ' : 'typy'} lístku
        </small>
      </div>

      {tiers.map((t, i) => {
        const l = t.qty - t.sold
        const soldOut = t.qty > 0 && l <= 0
        const expired = !!t.end_date && new Date(t.end_date).getTime() < Date.now()
        const active = !soldOut && !expired

        let sub = ''
        if (soldOut) sub = 'vyprodáno'
        else if (expired) sub = 'ukončeno'
        else if (t.end_date) sub = 'do ' + new Date(t.end_date).toLocaleDateString('cs-CZ')
        else if (t.qty > 0 && l <= 20) sub = l + ' zbývá'

        return (
          <div key={t.id} className={'tier' + (active ? '' : ' sold')}>
            <div className="wv">{String(i + 1).padStart(2, '0')}</div>
            <div>
              <div className="nm">{t.name}</div>
              {t.description ? <div className="ds">{t.description}</div> : null}
            </div>
            <div className="pr">
              {t.price ? fmt(t.price) : 'zdarma'}
              <small>{sub}</small>
            </div>
            <div className="act">
              {!active ? (
                <button className="btn btn-line btn-block" disabled>
                  {soldOut ? 'Vyprodáno' : 'Ukončeno'}
                </button>
              ) : !isLoggedIn ? (
                <Link
                  href="/login"
                  className="btn btn-amber btn-block"
                  style={{ textAlign: 'center' }}
                >
                  Přihlásit a koupit
                </Link>
              ) : (
                <button className="btn btn-amber btn-block" onClick={() => open(t)}>
                  Koupit lístek
                </button>
              )}
            </div>
          </div>
        )
      })}

      {openTier && (
        <div
          className="modal-bg"
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="eyebrow">{eventName}</div>
                <h3>{openTier.name}</h3>
              </div>
              <button className="back" onClick={close} style={{ fontSize: 20 }} aria-label="zavřít">
                ✕
              </button>
            </div>

            {!clientSecret ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 14,
                  }}
                >
                  <div className="muted" style={{ fontSize: 13 }}>
                    {openTier.description || 'vstupenka'}
                  </div>
                  <div className="stepper">
                    <button onClick={() => changeQty(-1)} disabled={qty <= 1} aria-label="ubrat">
                      –
                    </button>
                    <div className="n">{qty}</div>
                    <button
                      onClick={() => changeQty(1)}
                      disabled={qty >= Math.min(left, MAX_PER_ORDER)}
                      aria-label="přidat"
                    >
                      +
                    </button>
                  </div>
                </div>

                <label className="fld">
                  <span className="lab">Jméno a příjmení</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jan Novák" />
                </label>
                <label className="fld">
                  <span className="lab">E-mail (sem přijde lístek)</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ty@email.cz"
                  />
                </label>

                <div style={{ marginTop: 14, borderTop: '1px dashed var(--line)', paddingTop: 14 }}>
                  <label className="fld" style={{ marginTop: 0 }}>
                    <span className="lab">Slevový kód</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={promo}
                        onChange={(e) => setPromo(e.target.value.toUpperCase())}
                        placeholder="volitelné"
                        style={{ textTransform: 'uppercase' }}
                      />
                      <button className="btn btn-bone" type="button" onClick={applyPromo}>
                        Použít
                      </button>
                    </div>
                  </label>
                  {promoNote && (
                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 6,
                        fontFamily: 'var(--mono)',
                        color: promoOk ? 'var(--verd)' : 'var(--ember)',
                      }}
                    >
                      {promoNote}
                    </div>
                  )}
                </div>

                <div className="totrow">
                  <span className="l">Celkem</span>
                  <span className="v">
                    {promoOk && discount > 0 && (
                      <span
                        style={{
                          textDecoration: 'line-through',
                          color: 'var(--bone-dim)',
                          fontSize: 20,
                          marginRight: 8,
                        }}
                      >
                        {fmt(base)}
                      </span>
                    )}
                    {total > 0 ? fmt(total) : 'zdarma'}
                  </span>
                </div>

                <button
                  className="btn btn-verd btn-block"
                  style={{ marginTop: 16 }}
                  onClick={startPayment}
                  disabled={busy}
                >
                  {busy
                    ? 'Připravuji platbu…'
                    : total > 0
                    ? 'Pokračovat k platbě'
                    : 'Získat lístek zdarma'}
                </button>

                {error && (
                  <p style={{ color: 'var(--ember)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                    {error}
                  </p>
                )}
                <p className="fine">Platba probíhá bezpečně přes Stripe. Lístek je vázaný na termín akce.</p>
              </>
            ) : (
              <Elements stripe={stripePromise} options={{ clientSecret, locale: 'cs' }}>
                <PaymentStep amount={total} onBack={() => setClientSecret(null)} />
              </Elements>
            )}
          </div>
        </div>
      )}
    </>
  )
}
