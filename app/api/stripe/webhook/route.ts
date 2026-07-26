// Cesta v projektu: app/api/stripe/webhook/route.ts (přepsat stávající soubor)

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTicketEmail } from '@/lib/email/send-ticket-email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Chybí podpis.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    console.error('Neplatný Stripe webhook podpis:', err)
    return NextResponse.json({ error: 'Neplatný podpis.' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    const { event_id, tier_id, qty, promo_code, holder_name, holder_email } = intent.metadata

    const admin = createAdminClient()

    // payment_intent_id se posílá přímo do purchase_ticket RPC, které je teď
    // idempotentní - pokud webhook dorazí vícekrát pro stejnou platbu (Stripe
    // to umí, ať už retry nebo duplicitní doručení), RPC vrátí ten samý
    // existující lístek místo vytvoření duplicity a spotřeby kapacity navíc.
    const { data: result, error } = await admin.rpc('purchase_ticket', {
      p_event_id: event_id,
      p_tier_id: tier_id,
      p_qty: Number(qty),
      p_holder_name: holder_name,
      p_holder_email: holder_email,
      p_promo_code: promo_code || null,
      p_payment_intent_id: intent.id,
    })

    if (error) {
      console.error('purchase_ticket selhal po úspěšné platbě, vracím peníze:', error.message)

      // Uložíme důvod, aby o něm frontend (app/ticket/pending) mohl
      // zákazníka informovat hned, místo čekání na timeout.
      const { error: logError } = await admin
        .from('payment_failures')
        .upsert(
          { payment_intent_id: intent.id, reason: error.message },
          { onConflict: 'payment_intent_id' }
        )

      if (logError) {
        console.error('Nepodařilo se zapsat payment_failures záznam:', logError.message)
      }

      await stripe.refunds.create({ payment_intent: intent.id })
      return NextResponse.json({ received: true, refunded: true })
    }

    const ticket = result.ticket

    // Pokud lístek už existoval (tohle volání webhooku je duplicitní/retry),
    // e-mail už byl odeslaný napoprvé - neposílat ho znovu.
    if (result.is_new) {
      // ODESLÁNÍ E-MAILU SE VSTUPENKOU
      //
      // POZOR: dotaz níže předpokládá, že Supabase relace `events` a `tiers`
      // jsou dostupné přes FK join (tickets.event_id -> events, tickets.tier_id -> tiers)
      // a že sloupce se jmenují `code`, `events.name`, `events.date`, `tiers.name`.
      // Uprav názvy sloupců/relací podle skutečného schématu, pokud se liší -
      // pošli mi `select` definici tabulek nebo zprávu o chybě a doladím to přesně.
      const { data: fullTicket, error: fetchError } = await admin
        .from('tickets')
        .select('code, events(name, date), tiers(name)')
        .eq('id', ticket.id)
        .single()

      if (fetchError || !fullTicket) {
        console.error('Nepodařilo se načíst detail lístku pro e-mail:', fetchError?.message)
      } else {
        const eventData = Array.isArray(fullTicket.events) ? fullTicket.events[0] : fullTicket.events
        const tierData = Array.isArray(fullTicket.tiers) ? fullTicket.tiers[0] : fullTicket.tiers

        const emailResult = await sendTicketEmail({
          to: holder_email,
          holderName: holder_name,
          eventName: eventData?.name ?? '',
          waveName: tierData?.name ?? '',
          eventDate: formatEventDate(eventData?.date),
          ticketCode: fullTicket.code,
          ticketUrl: `https://echotix-app.vercel.app/ticket/${fullTicket.code}`,
        })

        if (!emailResult.success) {
          // Lístek existuje, jen e-mail selhal - nevracíme chybu Stripu, pouze logujeme
          console.error('Odeslání e-mailu se vstupenkou selhalo:', emailResult.error)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}

function formatEventDate(rawDate: string | undefined): string {
  if (!rawDate) return ''
  return new Date(rawDate).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
