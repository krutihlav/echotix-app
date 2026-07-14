'use client'
import { useState, useTransition } from 'react'
import { createEvent } from '@/app/organizer/actions'
import type { TierInput, PromoInput } from '@/app/organizer/actions'

export default function EventForm({ defaultOrganizer }: { defaultOrganizer: string }) {
  const [name, setName] = useState('')
  const [cat, setCat] = useState('')
  const [date, setDate] = useState('')
  const [place, setPlace] = useState('')
  const [map, setMap] = useState('')
  const [organizer, setOrganizer] = useState(defaultOrganizer)
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [lineup, setLineup] = useState('')
  const [published, setPublished] = useState(true)

  const [tiers, setTiers] = useState<TierInput[]>([
    { name: '', description: '', price: 0, qty: 100, end_date: null },
  ])
  const [promos, setPromos] = useState<PromoInput[]>([])

  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  // --- úpravy vln ---
  const setTier = (i: number, patch: Partial<TierInput>) =>
    setTiers((arr) => arr.map((t, k) => (k === i ? { ...t, ...patch } : t)))
  const addTier = () =>
    setTiers((arr) => [...arr, { name: '', description: '', price: 0, qty: 100, end_date: null }])
  const delTier = (i: number) => setTiers((arr) => arr.filter((_, k) => k !== i))

  // --- úpravy promo ---
  const setPromo = (i: number, patch: Partial<PromoInput>) =>
    setPromos((arr) => arr.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  const addPromo = () =>
    setPromos((arr) => [...arr, { code: '', type: 'pct', value: 10, usage_limit: null, end_date: null }])
  const delPromo = (i: number) => setPromos((arr) => arr.filter((_, k) => k !== i))

  function submit() {
    setError(null)
    if (!name.trim()) {
      setError('Zadej název akce.')
      return
    }
    const cleanTiers = tiers.filter((t) => t.name.trim())
    if (cleanTiers.length === 0) {
      setError('Přidej aspoň jednu vlnu lístků.')
      return
    }

    start(async () => {
      const res = await createEvent({
        name: name.trim(),
        cat,
        date,
        place,
        map,
        organizer,
        description,
        image,
        lineup: lineup.split('\n').map((s) => s.trim()).filter(Boolean),
        published,
        tiers: cleanTiers.map((t) => ({
          ...t,
          price: Number(t.price) || 0,
          qty: Number(t.qty) || 0,
        })),
        promos: promos
          .filter((p) => p.code.trim())
          .map((p) => ({
            ...p,
            code: p.code.trim(),
            value: Number(p.value) || 0,
            usage_limit: p.usage_limit ? Number(p.usage_limit) : null,
          })),
      })
      // při úspěchu funkce přesměruje na "/"; sem se dostaneme jen při chybě
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="form-head">
        <p className="h-eyebrow">Pořadatel</p>
        <h1 className="h-title">Nová akce</h1>
      </div>

      <div className="panel">
        {/* ZÁKLAD */}
        <div className="form-grid">
          <div className="field full">
            <label>Název akce *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label>Kategorie / žánr</label>
            <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="reggae · dub" />
          </div>
          <div className="field">
            <label>Datum</label>
            <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="8.–10. 8. 2026" />
          </div>
          <div className="field">
            <label>Místo</label>
            <input value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>
          <div className="field">
            <label>Odkaz na mapu</label>
            <input value={map} onChange={(e) => setMap(e.target.value)} placeholder="https://maps.app…" />
          </div>
          <div className="field">
            <label>Pořadatel (jméno)</label>
            <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} />
          </div>
          <div className="field">
            <label>Obrázek (URL)</label>
            <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…/plakat.jpg" />
          </div>
          <div className="field full">
            <label>Popis</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field full">
            <label>Line-up (jeden na řádek)</label>
            <textarea value={lineup} onChange={(e) => setLineup(e.target.value)} placeholder={'Iration Steppas\nŠvihadlo'} />
          </div>
        </div>

        {/* VLNY */}
        <div className="sub">
          <h2>Vlny lístků</h2>
          <button className="btn-ghost" type="button" onClick={addTier}>+ Přidat vlnu</button>
        </div>
        {tiers.map((t, i) => (
          <div className="row-item" key={i}>
            <div className="row-3">
              <div className="field" style={{ margin: 0 }}>
                <label>Název vlny</label>
                <input value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} placeholder="1. vlna" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Cena (Kč)</label>
                <input type="number" value={t.price} onChange={(e) => setTier(i, { price: Number(e.target.value) })} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Počet ks</label>
                <input type="number" value={t.qty} onChange={(e) => setTier(i, { qty: Number(e.target.value) })} />
              </div>
            </div>
            <div className="field" style={{ marginTop: 10, marginBottom: 0 }}>
              <label>Popis vlny</label>
              <input value={t.description} onChange={(e) => setTier(i, { description: e.target.value })} placeholder="3denní vstup · kemp v ceně" />
            </div>
            <div className="field" style={{ marginTop: 10, marginBottom: 10 }}>
              <label>Prodej do (nepovinné)</label>
              <input type="datetime-local" value={t.end_date ?? ''} onChange={(e) => setTier(i, { end_date: e.target.value || null })} />
            </div>
            {tiers.length > 1 && (
              <button className="btn-ghost btn-del" type="button" onClick={() => delTier(i)}>Odebrat vlnu</button>
            )}
          </div>
        ))}

        {/* PROMO */}
        <div className="sub">
          <h2>Promo kódy</h2>
          <button className="btn-ghost" type="button" onClick={addPromo}>+ Přidat kód</button>
        </div>
        {promos.length === 0 && (
          <p style={{ color: 'var(--bone-mute)', fontSize: 14, marginBottom: 8 }}>Zatím žádné (nepovinné).</p>
        )}
        {promos.map((p, i) => (
          <div className="row-item" key={i}>
            <div className="row-3">
              <div className="field" style={{ margin: 0 }}>
                <label>Kód</label>
                <input value={p.code} onChange={(e) => setPromo(i, { code: e.target.value.toUpperCase() })} placeholder="DUB26" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Typ</label>
                <select value={p.type} onChange={(e) => setPromo(i, { type: e.target.value as 'pct' | 'fixed' })}>
                  <option value="pct">Procenta %</option>
                  <option value="fixed">Pevná částka Kč</option>
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Hodnota</label>
                <input type="number" value={p.value} onChange={(e) => setPromo(i, { value: Number(e.target.value) })} />
              </div>
            </div>
            <div className="row-3" style={{ marginTop: 10 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Limit použití</label>
                <input type="number" value={p.usage_limit ?? ''} onChange={(e) => setPromo(i, { usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="neomezeno" />
              </div>
              <div className="field" style={{ margin: 0, gridColumn: 'span 2' }}>
                <label>Platí do (nepovinné)</label>
                <input type="datetime-local" value={p.end_date ?? ''} onChange={(e) => setPromo(i, { end_date: e.target.value || null })} />
              </div>
            </div>
            <button className="btn-ghost btn-del" type="button" onClick={() => delPromo(i)} style={{ marginTop: 10 }}>Odebrat kód</button>
          </div>
        ))}

        {/* PUBLIKOVAT */}
        <label className="check" style={{ marginTop: 20 }}>
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Rovnou publikovat (zobrazit na Objevit)
        </label>

        <button className="btn-primary" type="button" onClick={submit} disabled={pending}>
          {pending ? 'Ukládám…' : 'Vytvořit akci'}
        </button>

        {error && <div className="note err">{error}</div>}
      </div>
    </div>
  )
}
