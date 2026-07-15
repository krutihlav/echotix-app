'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TicketPending() {
  const router = useRouter()
  const params = useSearchParams()
  const paymentIntentId = params.get('payment_intent')
  const [note, setNote] = useState('Ověřuji platbu…')

  useEffect(() => {
    if (!paymentIntentId) {
      setNote('Chybí informace o platbě.')
      return
    }

    const supabase = createClient()
    let tries = 0

    const interval = setInterval(async () => {
      tries++
      const { data } = await supabase.rpc('get_ticket_by_payment_intent', {
        p_intent_id: paymentIntentId,
      })

      if (data?.code) {
        clearInterval(interval)
        router.push('/ticket/' + data.code)
        return
      }

      if (tries >= 15) {
        clearInterval(interval)
        setNote(
          'Platba se zpracovává déle, než obvykle. Zkontroluj e-mail nebo Moje lístky za pár minut.'
        )
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [paymentIntentId, router])

  return (
    <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
      <p className="muted">{note}</p>
    </div>
  )
}
