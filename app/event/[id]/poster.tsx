'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function EventPoster({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <button
        type="button"
        className="ev-poster-btn"
        onClick={() => setOpen(true)}
        aria-label="Zvětšit plakát"
      >
        <img src={src} alt={alt} className="ev-poster-img" />
      </button>

      {open && mounted
        ? createPortal(
            <div className="lightbox" onClick={() => setOpen(false)}>
              <img src={src} alt={alt} />
              <button
                type="button"
                className="lightbox-close"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                }}
                aria-label="Zavřít"
              >
                ✕
              </button>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
