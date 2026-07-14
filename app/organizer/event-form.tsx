'use client'
import { useState, useTransition } from 'react'
import { createEvent, updateEvent } from '@/app/organizer/actions'
import type { TierInputEdit, PromoInputEdit } from '@/app/organizer/actions'
import { createClient } from '@/lib/supabase/client'

// Klikni do číselného pole → rovnou přepiš, žádné mazání nuly předem.
const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()

type InitialEvent = {
  name: string
  cat: string
  date: string
  place: string
  map: string
  organizer: string
  description: string
  image: string
  lineup: string
  published: boolean
}

const emptyTier = (): TierInputEdit => ({ name: '', description: '', price: 0, qty: 100, end_date: null })
const emptyPromo = (): PromoInputEdit => ({ code: '', type: 'pct', value: 10, usage_limit: null, end_date: null })

export default function EventForm({
  mode = 'create',
  eventId,
  defaultOrganizer = '',
  initialEvent,
  initialTiers,
  initialPromos,
}: {
  mode?: 'create' | 'edit'
  eventId?: string
  defaultOrganizer?: string
  initialEvent?: InitialEvent
  initialTiers?: TierInputEdit[]
  initialPromos?: PromoInputEdit[]
}) {
  const [name, setName] = useState(initialEvent?.name ?? '')
  const [cat, setCat] = useState(initialEvent?.cat ?? '')
  const [date, setDate] = useState(initialEvent?.date ?? '')
  const [place, setPlace] = useState(initialEvent?.place ?? '')
  const [map, setMap] = useState(initialEvent?.map ?? '')
  const [organizer, setOrganizer] = useState(initialEvent?.organizer ?? defaultOrganizer)
  const [description, setDescription] = useState(initialEvent?.description ?? '')
  const [image, setImage] = useState(initialEvent?.image ?? '')
  const [uploading, setUploading] = useState(false)
  const [lineup, setLineup] = useState(initialEvent?.lineup ?? '')
  const [published, setPublished] = useState(initialEvent?.published ?? true)

  const [tiers, setTiers] = useState<TierInputEdit[]>(
    initialTiers && initialTiers.length ? initialTiers : [emptyTier()]
  )
  const [promos, setPromos] = useState<PromoInputEdit[]>(initialPromos ?? [])

  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // ať jde nahrát i stejný soubor znovu
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Nejsi přihlášený.')

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from('event-images').upload(path, file)
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from('event-images').getPublicUrl(path)
      setImage(pub.publicUrl)
    } catch (err) {
      setError('Nahrání obrázku selhalo: ' + (err instanceof Error ? err.message : 'neznámá chyba'))
    } finally {
      setUploading(false)
    }
  }

  // --- úpravy vln ---
  const setTier = (i: number, patch: Partial<TierInputEdit>) =>
    setTiers((arr) => arr.map((t, k) => (k === i ? { ...t, ...patch } : t)))
  const addTier = () => setTiers((arr) => [...arr, emptyTier()])
  const delTier = (i: number) => setTiers((arr) => arr.filter((_, k) => k !== i))

  // --- úpravy promo ---
  const setPromo = (i: number, patch: Partial<PromoInputEdit>) =>
    setPromos((arr) => arr.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  const addPromo = () => setPromos((arr) => [...arr, emptyPromo()])
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

    const basePayload = {
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
    }

    start(async () => {
      const res =
        mode === 'edit' && eventId
          ? await updateEvent(eventId, basePayload)
          : await createEvent(basePayload)
      // při úspěchu funkce přesměruje; sem se dostaneme jen při chybě
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="form-head">
        <p className="h-eyebrow">Promotér</p>
        <h1 className="h-title">{mode === 'edit' ? 'Upravit akci' : 'Nová akce'}</h1>
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
            <label>Promotér (jméno)</label>
            <input value={organizer} onChange={(e) => setOrganizer(e.target.value)} />
          </div>
          <div className="field full">
            <label>Plakát akce</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
            {uploading && (
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                Nahrávám…
              </p>
            )}
            {image && !uploading && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={image}
                  alt="Náhled plakátu"
                  style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }}
                />
                <button type="button" className="btn-ghost btn-del" onClick={() => setImage('')}>
                  Odebrat obrázek
                </button>
              </div>
            )}
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
        {tiers.map((t, i) => {
          const sold = t.sold ?? 0
          const locked = sold > 0
          return (
            <div className="row-item" key={t.id ?? `new-${i}`}>
              {locked && (
                <p style={{ color: 'var(--amber)', fontSize: 12.5, marginBottom: 10 }}>
                  Prodáno {sold} ks — kapacitu nejde snížit pod tento počet, vlnu nejde odebrat.
                </p>
              )}
              <div className="row-3">
                <div className="field" style={{ margin: 0 }}>
                  <label>Název vlny</label>
                  <input value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} placeholder="1. vlna" />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Cena (Kč)</label>
                  <input type="number" value={t.price} onFocus={selectOnFocus} onChange={(e) => setTier(i, { price: Number(e.target.value) })} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>Počet ks</label>
                  <input
                    type="number"
                    min={locked ? sold : 0}
                    value={t.qty}
                    onFocus={selectOnFocus}
                    onChange={(e) => setTier(i, { qty: Number(e.target.value) })}
                  />
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
                <button
                  className="btn-ghost btn-del"
                  type="button"
                  onClick={() => delTier(i)}
                  disabled={locked}
                  title={locked ? 'Nejde odebrat — má prodané lístky' : undefined}
                >
                  Odebrat vlnu
                </button>
              )}
            </div>
          )
        })}

        {/* PROMO */}
        <div className="sub">
          <h2>Promo kódy</h2>
          <button className="btn-ghost" type="button" onClick={addPromo}>+ Přidat kód</button>
        </div>
        {promos.length === 0 && (
          <p style={{ color: 'var(--bone-mute)', fontSize: 14, marginBottom: 8 }}>Zatím žádné (nepovinné).</p>
        )}
        {promos.map((p, i) => (
          <div className="row-item" key={p.id ?? `new-${i}`}>
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
                <input type="number" value={p.value} onFocus={selectOnFocus} onChange={(e) => setPromo(i, { value: Number(e.target.value) })} />
              </div>
            </div>
            <div className="row-3" style={{ marginTop: 10 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Limit použití</label>
                <input type="number" value={p.usage_limit ?? ''} onFocus={selectOnFocus} onChange={(e) => setPromo(i, { usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="neomezeno" />
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

        <button className="btn-primary" type="button" onClick={submit} disabled={pending || uploading}>
          {pending ? 'Ukládám…' : mode === 'edit' ? 'Uložit změny' : 'Vytvořit akci'}
        </button>

        {error && <div className="note err">{error}</div>}
      </div>
    </div>
  )
}
