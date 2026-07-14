import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { logout } from './auth/actions'

export const metadata: Metadata = {
  title: 'Echotix',
  description: 'Vstupenky na akce, které stojí za to.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role = 'visitor'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? 'visitor'
  }

  const name = (user?.user_metadata?.name as string) || user?.email || ''
  const canOrganize = role === 'organizer' || role === 'admin'
  const isAdmin = role === 'admin'

  return (
    <html lang="cs">
      <body>
        {/* Fonty z Google Fonts (React je automaticky přesune do <head>) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Big+Shoulders+Display:wght@600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />

        <header className="bar">
          <div className="bar-in">
            <div className="brand-group">
              <Link href="/" className="brand">
                <span className="name">
                  ECHO<em>TIX</em>
                </span>
              </Link>
              <Link href="/" className="nav-discover">
                Objevit
              </Link>
            </div>

            {/* CSS-only hamburger — bez JS: checkbox řídí zobrazení .acct na mobilu */}
            <input type="checkbox" id="nav-toggle" className="nav-toggle-input" />
            <label htmlFor="nav-toggle" className="nav-toggle-btn" aria-label="Menu">
              ☰
            </label>

            <div className="acct">
              {canOrganize && (
                <>
                  <Link href="/organizer" className="lo">
                    Moje akce
                  </Link>
                  <Link href="/organizer/new" className="lo">
                    + Vytvořit akci
                  </Link>
                  <Link href="/scan" className="lo">
                    Vstup / sken
                  </Link>
                </>
              )}
              {isAdmin && (
                <Link href="/admin" className="lo">
                  Admin
                </Link>
              )}
              {user ? (
                <>
                  <Link href="/my-tickets" className="lo">
                    Moje lístky
                  </Link>
                  <span className="who" title={user.email ?? ''}>
                    {name}
                  </span>
                  <form action={logout}>
                    <button className="lo" type="submit">
                      Odhlásit
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="lo"
                  style={{ borderColor: 'var(--amber)', color: 'var(--amber)' }}
                >
                  Přihlásit se
                </Link>
              )}
            </div>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
