'use client'

import { useCallback, useEffect, useState } from 'react'
import type { GalleryImage } from 'app/projects/utils'

type GalleryProps = {
  images: GalleryImage[]
  fallbackAlt?: string
}

export function Gallery({ images, fallbackAlt = '' }: GalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const close = useCallback(() => setOpenIndex(null), [])
  const prev = useCallback(() => {
    setOpenIndex((i) =>
      i === null ? null : (i - 1 + images.length) % images.length
    )
  }, [images.length])
  const next = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : (i + 1) % images.length))
  }, [images.length])

  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [openIndex, close, prev, next])

  if (!images || images.length === 0) return null

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-6">
        {images.map((img, idx) => (
          <button
            key={img.src}
            type="button"
            onClick={() => setOpenIndex(idx)}
            className="block w-full p-0 m-0 border-0 bg-transparent cursor-zoom-in"
            aria-label={`Open image ${idx + 1}`}
          >
            <div
              className="w-full bg-tertiary bg-cover bg-center"
              style={{
                backgroundImage: img.blurDataURL
                  ? `url(${img.blurDataURL})`
                  : undefined,
              }}
            >
              <img
                src={img.src}
                srcSet={img.srcset}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                alt={img.alt || fallbackAlt}
                width={img.width}
                height={img.height}
                loading={idx < 3 ? 'eager' : 'lazy'}
                decoding="async"
                className="w-full h-auto block"
              />
            </div>
          </button>
        ))}
      </div>
      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={close}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              close()
            }}
            className="absolute top-4 right-4 text-white text-3xl leading-none px-3 py-1"
            aria-label="Close"
          >
            ×
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  prev()
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white text-4xl leading-none px-3 py-2"
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  next()
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white text-4xl leading-none px-3 py-2"
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}
          <img
            src={images[openIndex].src}
            srcSet={images[openIndex].srcset}
            sizes="95vw"
            alt={images[openIndex].alt || fallbackAlt}
            width={images[openIndex].width}
            height={images[openIndex].height}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[95vw] max-h-[95vh] w-auto h-auto object-contain"
          />
        </div>
      )}
    </>
  )
}
