import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import NavMenu from './nav-menu'

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
                <span className="dot" aria-hidden="true"></span>
                Objevit
              </Link>
            </div>

            <NavMenu
              isLoggedIn={!!user}
              name={name}
              email={user?.email ?? ''}
              canOrganize={canOrganize}
              isAdmin={isAdmin}
            />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  )
}
