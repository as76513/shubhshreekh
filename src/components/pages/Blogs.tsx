"use client";

import { useEffect, useState } from 'react'
import { useAuth } from "@/lib/auth-context";
import { listOverviews, type Overview } from "@/lib/api";

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function Blogs() {
  const { withAuth } = useAuth();
  const [overviews, setOverviews] = useState<Overview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    withAuth((token) => listOverviews(token))
      .then((data) => { if (!cancelled) { setOverviews(data); setError('') } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load updates') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [withAuth])

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--blue-accent)' }}>
          Research
        </p>
        <h1
          className="text-3xl font-bold mb-1.5"
          style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--navy)' }}
        >
          Blogs
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
          Daily market overviews from our Research Analyst, newest first.
        </p>
      </div>

      {loading && (
        <p className="text-sm" style={{ color: 'var(--muted-text)' }}>Loading…</p>
      )}
      {!loading && error && (
        <p className="text-sm" style={{ color: 'var(--loss)' }}>{error}</p>
      )}
      {!loading && !error && overviews.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
          No updates posted yet — check back soon.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {overviews.map((o) => (
          <div
            key={o.id}
            className="rounded-2xl p-5"
            style={{ background: 'var(--card-bg)', borderLeft: '4px solid var(--blue-accent)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--blue-accent)' }}>
              {fmtDate(o.publishedAt)}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--navy)' }}>
              {o.text}
            </p>
            {o.photoUrls && o.photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {o.photoUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="w-24 h-24 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
