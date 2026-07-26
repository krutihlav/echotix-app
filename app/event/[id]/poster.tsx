'use client'

import { useState } from 'react'

export default function EventPoster({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)

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

      {open ? (
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
        </div>
      ) : null}
    </>
  )
}
