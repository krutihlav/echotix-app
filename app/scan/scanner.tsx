'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ResKind = 'ok' | 'warn' | 'bad'
type Result = { kind: ResKind; title: string; who?: string; id?: string } | null

export default function Scanner() {
  const supabase = createClient()

  const [manual, setManual] = useState('')
  const [result, setResult] = useState<Result>(null)
  const [camOn, setCamOn] = useState(false)
  const [camErr, setCamErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)
  const lockRef = useRef(false) // brání opakovanému zpracování stejného kódu z kamery
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (resultTimer.current) clearTimeout(resultTimer.current)
      void stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startCamera() {
    setCamErr(null)
    if (typeof window === 'undefined') return
    if (!window.isSecureContext || !navigator.mediaDevices) {
      setCamErr(
        'Kamera potřebuje zabezpečené připojení (HTTPS nebo localhost). Na telefonu přes http://IP:3000 nepojede — použij ruční zadání kódu, nebo nasaď na HTTPS (Vercel).'
      )
      return
    }
    try {
      const mod = await import('html5-qrcode')
      const Html5Qrcode = mod.Html5Qrcode
      const el = document.getElementById('reader')
      if (!el) return
      const scanner = new Html5Qrcode('reader')
      scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void }
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        (decoded: string) => onDetected(decoded),
        () => {} // chyby dekódování jednotlivých snímků ignorujeme
      )
      setCamOn(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'neznámá chyba'
      setCamErr('Kameru se nepodařilo spustit (' + msg + '). Zkontroluj oprávnění, nebo použij ruční zadání.')
    }
  }

  async function stopCamera() {
    const s = scannerRef.current
    scannerRef.current = null
    setCamOn(false)
    if (s) {
      try {
        await s.stop()
      } catch {}
      try {
        s.clear()
      } catch {}
    }
  }

  function onDetected(code: string) {
    if (lockRef.current) return
    lockRef.current = true
    void verify(code).finally(() => {
      setTimeout(() => {
        lockRef.current = false
      }, 2200)
    })
  }

  async function verify(raw: string) {
    const code = (raw || '').trim().toUpperCase()
    if (!code) return
    setBusy(true)
    const { data, error } = await supabase.rpc('check_in_ticket', { p_code: code })
    setBusy(false)

    if (error) {
      showResult({ kind: 'bad', title: 'CHYBA', who: error.message, id: code })
      return
    }

    const status = data?.status
    const who = [data?.holder, data?.tier].filter(Boolean).join(' · ')

    if (status === 'VALID') {
      const q = Number(data?.qty) > 1 ? ' · ' + data.qty + '×' : ''
      showResult({ kind: 'ok', title: 'PLATNÝ', who: who + q, id: code })
    } else if (status === 'USED') {
      const when = data?.used_at
        ? new Date(data.used_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
        : ''
      showResult({ kind: 'warn', title: 'UŽ POUŽITÝ', who, id: code + (when ? ' · v ' + when : '') })
    } else if (status === 'FORBIDDEN') {
      showResult({ kind: 'bad', title: 'NEPLATNÝ', who: 'lístek nepatří k tvé akci', id: code })
    } else {
      showResult({ kind: 'bad', title: 'NEPLATNÝ', who: 'lístek neexistuje', id: code })
    }
  }

  function showResult(r: Result) {
    setResult(r)
    if (resultTimer.current) clearTimeout(resultTimer.current)
    resultTimer.current = setTimeout(() => setResult(null), 2100)
  }

  function badge(kind: ResKind) {
    if (kind === 'ok')
      return (
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
          <path d="M4 12.5l5 5L20 6.5" stroke="#0B1410" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    if (kind === 'warn')
      return (
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
          <path d="M12 3l9 16H3L12 3z" stroke="#1A1208" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M12 10v4M12 16.5v.5" stroke="#1A1208" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )
    return (
      <svg viewBox="0 0 24 24" width="40" height="40" fill="none">
        <path d="M6 6l12 12M18 6L6 18" stroke="#1A0A06" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  const resClass = (k: ResKind) => (k === 'ok' ? 'r-ok' : k === 'warn' ? 'r-warn' : 'r-bad')

  function submitManual() {
    void verify(manual)
    setManual('')
  }

  return (
    <div>
      <div className="adm-head">
        <h2>Vstup · sken</h2>
        <div className="eyebrow" style={{ alignSelf: 'center' }}>
          brána · živě
        </div>
      </div>

      <div className={'cam' + (camOn && !result ? ' scanning' : '')} id="cam">
        <div id="reader" />
        <div className="reticle">
          <span className="tl" />
          <span className="tr" />
          <span className="bl" />
          <span className="br" />
        </div>
        <div className="scanline" />

        {!camOn && !result && (
          <button className="btn btn-amber" style={{ position: 'relative', zIndex: 2 }} onClick={startCamera}>
            Spustit kameru
          </button>
        )}

        {result && (
          <div className={'result ' + resClass(result.kind) + ' show'}>
            <div className="badge">{badge(result.kind)}</div>
            <h3>{result.title}</h3>
            {result.who && <div className="who">{result.who}</div>}
            {result.id && <div className="id">{result.id}</div>}
          </div>
        )}
      </div>

      <div className="codebar">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value.toUpperCase())}
          placeholder="ECHO-XXXX-XXXX"
          maxLength={24}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitManual()
          }}
        />
        <button className="btn btn-bone" disabled={busy} onClick={submitManual}>
          Ověřit
        </button>
      </div>

      {camErr && (
        <p
          style={{
            maxWidth: 420,
            margin: '12px auto 0',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: 'var(--bone-dim)',
            textAlign: 'center',
          }}
        >
          {camErr}
        </p>
      )}

      {camOn && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="btn btn-line" onClick={() => void stopCamera()}>
            Vypnout kameru
          </button>
        </div>
      )}
    </div>
  )
}
