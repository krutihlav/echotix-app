import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EventForm from '../../event-form'

export const dynamic = 'force-dynamic'

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single()
  if (!event) notFound()

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  if (event.owner_id !== user.id && !isAdmin) {
    return <div className="empty">Tahle akce ti nepatří.</div>
  }

  const [{ data: tiers }, { data: promos }] = await Promise.all([
    supabase.from('tiers').select('*').eq('event_id', id).order('created_at', { ascending: true }),
    supabase.from('promos').select('*').eq('event_id', id).order('created_at', { ascending: true }),
  ])

  return (
    <EventForm
      mode="edit"
      eventId={event.id}
      initialEvent={{
        name: event.name,
        cat: event.cat ?? '',
        date: event.date ?? '',
        place: event.place ?? '',
        map: event.map ?? '',
        organizer: event.organizer ?? '',
        description: event.description ?? '',
        image: event.image ?? '',
        lineup: (event.lineup ?? []).join('\n'),
        published: event.published,
      }}
      initialTiers={(tiers ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? '',
        price: t.price,
        qty: t.qty,
        end_date: t.end_date ? t.end_date.slice(0, 16) : null,
        sold: t.sold,
      }))}
      initialPromos={(promos ?? []).map((p) => ({
        id: p.id,
        code: p.code,
        type: p.type,
        value: p.value,
        usage_limit: p.usage_limit,
        end_date: p.end_date ? p.end_date.slice(0, 16) : null,
      }))}
    />
  )
}
