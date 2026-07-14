'use client'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { deleteEventAdmin, toggleEventPublished } from './actions'

type Event = {
  id: string
  name: string
  cat: string | null
  date: string | null
  published: boolean
}

export default function AdminEventRow({
  event,
  ownerName,
  sold,
  qty,
}: {
  event: Event
  ownerName: string
  sold: number
  qty: number
}) {
  const [published, setPublished] = useState(event.published)
  const [deleted, setDeleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (deleted) return null

  function onToggle() {
    setError(null)
    const next = !published
    startTransition(async () => {
      const res = await toggleEventPublished(event.id, next)
      if (res?.error) setError(res.error)
      else setPublished(next)
    })
  }

  function onDelete() {
    if (!confirm(`Opravdu trvale smazat akci „${event.name}"?`)) return
    setError(null)
    startTransition(async () => {
      const res = await deleteEventAdmin(event.id)
      if (res?.error) setError(res.error)
      else setDeleted(true)
    })
  }

  return (
    <div className="ev-row">
      <div className="ev-row-main">
        <strong>{event.name}</strong>
        <span className="meta">
          {[event.cat, event.date, `promotér: ${ownerName}`, `${sold}/${qty} prodáno`]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {error && <span className="meta" style={{ color: 'var(--ember)' }}>{error}</span>}
      </div>
      <div className="ev-row-actions">
        <span className={`pill ${published ? 'pill-live' : 'pill-draft'}`}>
          {published ? 'live' : 'koncept'}
        </span>
        <Link href={`/organizer/${event.id}/edit`} className="btn-ghost">
          Upravit
        </Link>
        <button className="btn-ghost" onClick={onToggle} disabled={pending}>
          {published ? 'Skrýt' : 'Publikovat'}
        </button>
        <button className="btn-ghost btn-del" onClick={onDelete} disabled={pending}>
          Smazat
        </button>
      </div>
    </div>
  )
}
