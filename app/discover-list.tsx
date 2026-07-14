'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'

type Ev = {
  id: string
  name: string
  cat: string | null
  date: string | null
  place: string | null
  image: string | null
  from: number
  soldOut: boolean
}

const fmt = (n: number) => n.toLocaleString('cs-CZ') + ' Kč'

export default function DiscoverList({ events }: { events: Ev[] }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)

  // kategorie vytáhneme z akcí (rozdělíme podle · a ,)
  const cats = useMemo(() => {
    const s = new Set<string>()
    events.forEach((e) => {
      if (e.cat)
        e.cat
          .split(/[·,/]/)
          .map((x) => x.trim())
          .filter(Boolean)
          .forEach((c) => s.add(c))
    })
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'cs'))
  }, [events])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return events.filter((e) => {
      const hay = [e.name, e.place, e.cat].filter(Boolean).join(' ').toLowerCase()
      const okQ = !needle || hay.includes(needle)
      const okC = !cat || (e.cat || '').toLowerCase().includes(cat.toLowerCase())
      return okQ && okC
    })
  }, [events, q, cat])

  const filtering = q.trim().length > 0 || cat !== null

  return (
    <>
      <div className="filter">
        <div className="search">
          <span className="ic">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hledat akci, místo, žánr…"
          />
        </div>
        {cats.length > 0 && (
          <div className="cats">
            <button className={'catchip' + (cat === null ? ' on' : '')} onClick={() => setCat(null)}>
              Vše
            </button>
            {cats.map((c) => (
              <button
                key={c}
                className={'catchip' + (cat === c ? ' on' : '')}
                onClick={() => setCat(c === cat ? null : c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="row-h">
        <h2>Nadcházející akce</h2>
        <small>
          {filtered.length} {filtering ? 'nalezeno' : 'v předprodeji'}
        </small>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <h3>{events.length ? 'Nic nenalezeno' : 'Zatím tu nic nehraje'}</h3>
          <p>
            {events.length
              ? 'Zkus jiný výraz nebo kategorii.'
              : 'Brzy se tu objeví první akce.'}
          </p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((ev) => (
            <Link key={ev.id} href={`/event/${ev.id}`} className="ecard">
              <div
                className="top"
                style={
                  ev.image
                    ? { background: `url('${ev.image}') center/cover` }
                    : {
                        background:
                          'radial-gradient(120% 80% at 20% 0%,rgba(242,166,58,.12),transparent 60%)',
                      }
                }
              >
                <div className="cat">{ev.cat || 'akce'}</div>
                <div className="ttl">{ev.name}</div>
                <div className="meta">
                  <span>◈ {ev.date || 'termín brzy'}</span>
                  <span>◈ {ev.place || 'místo brzy'}</span>
                </div>
              </div>
              <div className="bottom">
                {ev.soldOut ? (
                  <div className="tag-sold">Vyprodáno</div>
                ) : (
                  <div className="from">
                    od <b>{ev.from > 0 ? fmt(ev.from) : 'zdarma'}</b>
                  </div>
                )}
                <div className="go">Lístky →</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
