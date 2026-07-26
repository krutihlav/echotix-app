// Cesta v projektu: app/ticket/pending/page.tsx (přepsat stávající soubor)
'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TicketPending() {
  const router = useRouter()
  const params = useSearchParams()
  const paymentIntentId = params.get('payment_intent')
  const [note, setNote] = useState('Ověřuji platbu…')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!paymentIntentId) {
      setNote('Chybí informace o platbě.')
      return
    }

    const supabase = createClient()
    let tries = 0

    const interval = setInterval(async () => {
      tries++

      // Nejdřív zkontrolujeme, jestli platba neskončila refundem (vlna se
      // vyprodala mezi platbou a zpracováním webhooku) - v tom případě nemá
      // smysl čekat na timeout, lístek stejně nikdy nevznikne.
      const { data: failureReason } = await supabase.rpc('get_payment_failure', {
        p_intent_id: paymentIntentId,
      })

      if (failureReason) {
        clearInterval(interval)
        setFailed(true)
        setNote(
          'Bohužel se vlna vyprodala dřív, než se tvoje platba stihla zpracovat. Peníze se ti automaticky vrací zpět na kartu (obvykle do 5-10 pracovních dní).'
        )
        return
      }

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
      {failed && (
        <p className="muted" style={{ marginTop: '1rem', fontSize: '0.9em' }}>
          Omlouváme se za nepříjemnost. Zkus to prosím znovu, nebo nás kontaktuj, pokud
          budeš potřebovat pomoct.
        </p>
      )}
    </div>
  )
}
