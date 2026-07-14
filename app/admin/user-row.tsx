'use client'
import { useState, useTransition } from 'react'
import { setUserRole } from './actions'

type Profile = {
  id: string
  email: string
  name: string | null
  role: string
  created_at: string
}

export default function AdminUserRow({
  profile,
  currentUserId,
}: {
  profile: Profile
  currentUserId: string
}) {
  const [role, setRole] = useState(profile.role)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const isSelf = profile.id === currentUserId

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as 'visitor' | 'organizer' | 'admin'
    const prev = role
    setError(null)
    setRole(next) // optimistické UI, vrátíme zpět při chybě
    startTransition(async () => {
      const res = await setUserRole(profile.id, next)
      if (res?.error) {
        setError(res.error)
        setRole(prev)
      }
    })
  }

  return (
    <div className="ev-row">
      <div className="ev-row-main">
        <strong>{profile.name || profile.email}</strong>
        <span className="meta mono">{profile.email}</span>
        {error && <span className="meta" style={{ color: 'var(--ember)' }}>{error}</span>}
      </div>
      <div className="ev-row-actions">
        <select className="role-select" value={role} onChange={onChange} disabled={pending || isSelf}>
          <option value="visitor">visitor</option>
          <option value="organizer">organizer</option>
          <option value="admin">admin</option>
        </select>
      </div>
    </div>
  )
}
