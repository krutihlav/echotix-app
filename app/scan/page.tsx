import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Scanner from './scanner'

export const dynamic = 'force-dynamic'

export default async function ScanPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="empty">
        <h3>Přihlaš se</h3>
        <p>Skener vstupu je jen pro pořadatele.</p>
        <Link href="/login" className="btn btn-amber" style={{ marginTop: 16, display: 'inline-block' }}>
          Přihlásit se
        </Link>
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
      <div className="empty" style={{ borderColor: 'var(--ember)' }}>
        <h3 style={{ color: 'var(--ember)' }}>Tady je území pořadatelů</h3>
        <p>Skener vstupu je dostupný jen pořadatelům a adminům.</p>
        <Link href="/" className="btn btn-line" style={{ marginTop: 16, display: 'inline-block' }}>
          Zpět na akce
        </Link>
      </div>
    )
  }

  return <Scanner />
}
