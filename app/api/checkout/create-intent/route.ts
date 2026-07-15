import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 })
  }

  const { event_id, tier_id, qty, promo_code, holder_name, holder_email } = body

  if (
    !event_id ||
    !tier_id ||
    !qty ||
    qty < 1 ||
    qty > 20 ||
    !holder_name?.trim() ||
    !holder_email?.trim()
  ) {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 })
  }

  const supabase = await createClient()

  // Cenu vždy počítáme tady na serveru, nikdy nedůvěřujeme částce z klienta.
  const { data: tier, error: tierErr } = await supabase
    .from('tiers')
    .select('id, price, qty, sold, end_date, event_id')
    .eq('id', tier_id)
    .eq('event_id', event_id)
    .single()

  if (tierErr || !tier) {
    return NextResponse.json({ error: 'Vlna lístků nenalezena.' }, { status: 404 })
  }
  if (tier.end_date && new Date(tier.end_date).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Prodej této vlny už skončil.' }, { status: 400 })
  }
  if (tier.sold + qty > tier.qty) {
    return NextResponse.json({ error: 'Tolik lístků už není.' }, { status: 400 })
  }

  const base = tier.price * qty
  let total = base
  let appliedPromo: string | null = null

  if (promo_code && String(promo_code).trim()) {
    const { data: promoResult, error: promoErr } = await supabase.rpc('preview_promo', {
      p_event_id: event_id,
      p_code: String(promo_code).trim(),
      p_base: base,
    })
    if (promoErr || !promoResult?.ok) {
      return NextResponse.json(
        { error: promoResult?.reason || 'Promo kód neplatí.' },
        { status: 400 }
      )
    }
    total = Number(promoResult.total)
    appliedPromo = promoResult.code
  }

  // Bezplatné lístky nejdou přes Stripe — vytvoříme rovnou přes service_role.
  if (total <= 0) {
    const admin = createAdminClient()
    const { data: ticket, error } = await admin.rpc('purchase_ticket', {
      p_event_id: event_id,
      p_tier_id: tier_id,
      p_qty: qty,
      p_holder_name: holder_name.trim(),
      p_holder_email: holder_email.trim(),
      p_promo_code: appliedPromo,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ free: true, code: ticket.code })
  }

  const amountInHalir = Math.round(total * 100)

  const intent = await stripe.paymentIntents.create({
    amount: amountInHalir,
    currency: 'czk',
    automatic_payment_methods: { enabled: true },
    metadata: {
      event_id,
      tier_id,
      qty: String(qty),
      promo_code: appliedPromo || '',
      holder_name: holder_name.trim(),
      holder_email: holder_email.trim(),
    },
  })

  return NextResponse.json({ client_secret: intent.client_secret, amount: total })
}
