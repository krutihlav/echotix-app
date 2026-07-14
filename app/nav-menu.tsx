'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { logout } from './auth/actions'

export default function NavMenu({
  isLoggedIn,
  name,
  email,
  canOrganize,
  isAdmin,
}: {
  isLoggedIn: boolean
  name: string
  email: string
  canOrganize: boolean
  isAdmin: boolean
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)

  // zavřít obě menu při přechodu na jinou stránku
  useEffect(() => {
    setMobileOpen(false)
    setUserOpen(false)
  }, [pathname])

  // zavřít dropdown jména při kliknutí mimo něj a při Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setUserOpen(false)
        setMobileOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <>
      <button
        type="button"
        className="nav-toggle-btn"
        aria-label="Menu"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((v) => !v)}
      >
        ☰
      </button>

      {/* ---- DESKTOP ---- */}
      <div className="acct acct-desktop">
        {canOrganize && (
          <>
            <Link href="/organizer/new" className="lo">
              + Vytvořit akci
            </Link>
            <Link href="/scan" className="lo">
              Vstup / sken
            </Link>
          </>
        )}
        {isLoggedIn ? (
          <div className="user-menu" ref={userRef}>
            <button
              type="button"
              className="lo who-btn"
              onClick={() => setUserOpen((v) => !v)}
              aria-expanded={userOpen}
            >
              {name} <span aria-hidden="true">▾</span>
            </button>
            {userOpen && (
              <div className="user-dropdown">
                {canOrganize && (
                  <Link href="/organizer" className="dd-item">
                    Moje akce
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/admin" className="dd-item">
                    Admin
                  </Link>
                )}
                <Link href="/my-tickets" className="dd-item">
                  Moje lístky
                </Link>
                <form action={logout}>
                  <button className="dd-item dd-danger" type="submit">
                    Odhlásit
                  </button>
                </form>
              </div>
            )}
          </div>
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

      {/* ---- MOBIL (hamburger) ---- */}
      {mobileOpen && (
        <div className="acct acct-mobile">
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
          {isLoggedIn ? (
            <>
              <Link href="/my-tickets" className="lo">
                Moje lístky
              </Link>
              <span className="who" title={email}>
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
      )}
    </>
  )
}
