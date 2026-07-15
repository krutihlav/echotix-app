import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'

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

    const { data: existing } = await admin
      .from('tickets')
      .select('id')
      .eq('stripe_payment_intent_id', intent.id)
      .maybeSingle()

    if (!existing) {
      const { data: ticket, error } = await admin.rpc('purchase_ticket', {
        p_event_id: event_id,
        p_tier_id: tier_id,
        p_qty: Number(qty),
        p_holder_name: holder_name,
        p_holder_email: holder_email,
        p_promo_code: promo_code || null,
      })

      if (error) {
        console.error('purchase_ticket selhal po úspěšné platbě, vracím peníze:', error.message)
        await stripe.refunds.create({ payment_intent: intent.id })
        return NextResponse.json({ received: true, refunded: true })
      }

      await admin
        .from('tickets')
        .update({ stripe_payment_intent_id: intent.id })
        .eq('id', ticket.id)
    }
  }

  return NextResponse.json({ received: true })
}
