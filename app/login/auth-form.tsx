'use client'
import { useState } from 'react'
import { login, signup } from '@/app/auth/actions'

export default function AuthForm({
  error,
  msg,
}: {
  error?: string
  msg?: string
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="auth-wrap">
      <div className="panel">
        <div className="tabs">
          <button
            className={mode === 'login' ? 'on' : ''}
            onClick={() => setMode('login')}
            type="button"
          >
            Přihlásit
          </button>
          <button
            className={mode === 'signup' ? 'on' : ''}
            onClick={() => setMode('signup')}
            type="button"
          >
            Registrovat
          </button>
        </div>

        {/* action míří přímo na server action podle zvoleného režimu */}
        <form action={mode === 'login' ? login : signup}>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="name">Jméno</label>
              <input id="name" name="name" type="text" required autoComplete="name" />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Heslo</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <button className="btn-primary" type="submit">
            {mode === 'login' ? 'Přihlásit se' : 'Vytvořit účet'}
          </button>
        </form>

        {error && <div className="note err">{error}</div>}
        {msg && <div className="note ok">{msg}</div>}
      </div>
    </div>
  )
}
