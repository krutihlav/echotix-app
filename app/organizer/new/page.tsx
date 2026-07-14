import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import EventForm from './event-form'

export const dynamic = 'force-dynamic'

export default async function NewEventPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="empty">
        Nejdřív se <Link href="/login" style={{ color: 'var(--amber)' }}>přihlas</Link>.
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'visitor'

  if (role !== 'organizer' && role !== 'admin') {
    return (
      <div className="empty">
        Tvorba akcí je jen pro pořadatele. Tvoje role je „{role}“.
        <br />
        Roli lze povýšit v Supabase (SQL): <br />
        <code style={{ color: 'var(--amber)' }}>
          update public.profiles set role = &apos;admin&apos; where email = &apos;{user.email}&apos;;
        </code>
      </div>
    )
  }

  return <EventForm defaultOrganizer={(user.user_metadata?.name as string) || ''} />
}
