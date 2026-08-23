"use client";

import { useState } from 'react'
import { videos } from "@/lib/data";
import { useAuth } from "@/lib/auth-context"

const categories = ['All', 'Technical Analysis', 'Fundamental Analysis', 'Mutual Funds', 'Derivatives', 'Market Analysis', 'Taxation', 'Tools & Research', 'Strategy']

export default function Videos() {
  const { user, navigate, onUpgrade } = useAuth();
  const isPro = user?.subscription === 'pro'
  const [category, setCategory] = useState('All')
  const [activeVideo, setActiveVideo] = useState<number | null>(null)

  const filtered = videos.filter(v => category === 'All' || v.category === category)

  const handlePlay = (id: number, isPro: boolean) => {
    if (isPro && !user?.subscription) {
      if (!user) { navigate('login'); return }
      onUpgrade()
      return
    }
    if (isPro && user?.subscription !== 'pro') {
      onUpgrade()
      return
    }
    setActiveVideo(id)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--primary)' }}>
          Video Library
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-bold mb-1.5"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
            >
              Video Tutorials
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Watch expert-led tutorials on markets, analysis, and investing strategies.
            </p>
          </div>
          {!isPro && (
            <button
              onClick={onUpgrade}
              className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))', color: 'var(--primary-foreground)' }}
            >
              ✦ Unlock All
            </button>
          )}
        </div>
      </div>

      {/* Featured / Active Video Player */}
      {activeVideo && (
        <div
          className="rounded-2xl overflow-hidden mb-8"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {(() => {
            const v = videos.find(v => v.id === activeVideo)
            if (!v) return null
            return (
              <div>
                <div
                  className="relative"
                  style={{ aspectRatio: '16/9', background: 'var(--secondary)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                    style={{ background: 'var(--overlay-70)' }}
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                      style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                    >
                      ▶
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {v.title} — demo mode
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveVideo(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all hover:scale-110"
                    style={{ background: 'var(--overlay-70)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold" style={{ color: 'var(--foreground)' }}>
                    {v.title}
                  </h3>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    by {v.instructor} · {v.duration} · {v.views} views
                  </p>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: category === c ? 'var(--primary-12)' : 'var(--card)',
              color: category === c ? 'var(--primary)' : 'var(--muted-foreground)',
              border: '1px solid',
              borderColor: category === c ? 'var(--primary-30)' : 'var(--border)',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {filtered.map(v => {
          const locked = v.isPro && !isPro
          const isActive = activeVideo === v.id
          return (
            <div
              key={v.id}
              className="rounded-xl overflow-hidden cursor-pointer group transition-all hover:-translate-y-1"
              style={{
                background: 'var(--card)',
                border: isActive ? '1px solid var(--primary-40)' : '1px solid var(--border)',
              }}
              onClick={() => handlePlay(v.id, v.isPro)}
            >
              {/* Thumbnail */}
              <div
                className="relative overflow-hidden"
                style={{ aspectRatio: '16/9', background: 'var(--secondary)' }}
              >
                <img
                  src={v.thumbnail}
                  alt={v.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  style={{ background: 'var(--overlay-55)' }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                  >
                    {locked ? '🔒' : '▶'}
                  </div>
                </div>
                {isActive && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'var(--primary-15)' }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-lg"
                      style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                    >
                      ▶
                    </div>
                  </div>
                )}
                <div
                  className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded font-mono"
                  style={{ background: 'var(--overlay-85)', color: 'var(--foreground)' }}
                >
                  {v.duration}
                </div>
                {v.isPro && (
                  <div
                    className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))', color: 'var(--primary-foreground)' }}
                  >
                    PRO
                  </div>
                )}
                {!v.isPro && (
                  <div
                    className="absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(14,203,129,0.2)', color: 'var(--accent)', backdropFilter: 'blur(8px)' }}
                  >
                    FREE
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3.5">
                <h4 className="text-sm font-semibold line-clamp-2 mb-2" style={{ color: 'var(--foreground)' }}>
                  {v.title}
                </h4>
                <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
                  {v.instructor}
                </p>
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  <span>{v.views} views</span>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--secondary)' }}
                  >
                    {v.category}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!isPro && (
        <div
          className="mt-10 rounded-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(160deg, var(--primary-06) 0%, transparent 100%)',
            border: '1px dashed var(--primary-30)',
          }}
        >
          <p className="text-3xl mb-3">🎬</p>
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}>
            Unlock {videos.filter(v => v.isPro).length} Pro video tutorials
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--muted-foreground)' }}>
            Options, sector rotation, stock screeners, and advanced strategies — all in Pro.
          </p>
          <button
            onClick={onUpgrade}
            className="px-8 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))', color: 'var(--primary-foreground)' }}
          >
            Upgrade to Pro · ₹999/month
          </button>
        </div>
      )}
    </div>
  )
}
