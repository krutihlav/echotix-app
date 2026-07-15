'use client'
import { useState } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'

const fmt = (n: number) => (n || 0).toLocaleString('cs-CZ') + ' Kč'

export default function PaymentStep({
  amount,
  onBack,
}: {
  amount: number
  onBack: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    if (!stripe || !elements) return
    setBusy(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/ticket/pending',
      },
    })

    // Pokud kód doběhne sem, platbu nebylo potřeba přesměrovat pryč (3D Secure
    // apod. přesměruje samo a return_url pak zpracuje /ticket/pending stránka).
    if (stripeError) {
      setError(stripeError.message || 'Platbu se nepodařilo dokončit.')
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 14 }}>
      <PaymentElement />
      <button
        className="btn btn-verd btn-block"
        style={{ marginTop: 16 }}
        onClick={confirm}
        disabled={busy || !stripe}
      >
        {busy ? 'Zpracovávám…' : 'Zaplatit ' + fmt(amount)}
      </button>
      <button className="btn btn-line btn-block" style={{ marginTop: 8 }} onClick={onBack} disabled={busy}>
        Zpět
      </button>
      {error && (
        <p style={{ color: 'var(--ember)', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  )
}
