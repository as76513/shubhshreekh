"use client";

import { useEffect, useState } from "react";
import { todaysUpdate, courses } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { getLatestOverview, getWeeklyPDF, type Overview, type WeeklyPDF } from "@/lib/api";

export default function Dashboard() {
  const { user, navigate, withAuth } = useAuth();
  const isPro = user?.subscription === 'pro'
  // RA/admin accounts land on /admin now (see auth-context.tsx's login()),
  // but this still guards direct navigation here — an analyst publishing
  // content has no reason to see a customer-facing "Pro Member" banner.
  const isCustomer = user?.role === 'customer' || !user?.role

  const [overview, setOverview] = useState<Overview | null>(null)
  const [weeklyPdf, setWeeklyPdf] = useState<WeeklyPDF | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    withAuth((token) => getLatestOverview(token))
      .then((data) => { if (!cancelled) setOverview(data) })
      .catch(() => { /* no overview posted yet — card just doesn't render */ })
    withAuth((token) => getWeeklyPDF(token))
      .then((data) => { if (!cancelled) setWeeklyPdf(data) })
      .catch(() => { /* falls back to the static placeholder below */ })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  if (!user) return null
  const featuredCourses = courses.slice(0, 3)
  // TD-058: show the RA's uploaded PDF once one exists; the static file
  // stays as the fallback so this card is never empty on a fresh deploy.
  const pdfTitle = weeklyPdf?.pdfUrl ? weeklyPdf.title : todaysUpdate.title
  const pdfSummary = weeklyPdf?.pdfUrl ? weeklyPdf.summary : todaysUpdate.summary
  const pdfHref = weeklyPdf?.pdfUrl || todaysUpdate.pdfUrl

  return (
    <div className="min-h-screen" style={{ background: 'var(--screen-bg)' }}>
      <div
        className="px-4 sm:px-6 lg:px-8 pt-8 pb-6 mb-8"
        style={{
          background: 'linear-gradient(150deg, var(--navy), var(--navy-2))',
          borderRadius: '0 0 20px 20px',
        }}
      >
        <div className="max-w-7xl mx-auto">
          <h1
            className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight"
            style={{ color: '#ffffff', fontFamily: 'DM Serif Display, serif' }}
          >
            Hello {user.name}! 👋
          </h1>
          {isPro && isCustomer && (
            <p
              className="inline-flex items-center gap-1.5 text-sm font-bold mt-1.5 mb-1.5 px-3 py-1 rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--navy-gold-soft) 20%, transparent)',
                color: '#f1d27a',
                border: '1px solid color-mix(in srgb, var(--navy-gold-soft) 45%, transparent)',
              }}
            >
              🎉 Congratulations, Pro Member! 🎈
            </p>
          )}
          <p className="text-sm" style={{ color: '#b9c8e0' }}>
            Thursday, 21 August 2026 · NSE Open
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {overview && (
          <div
            className="rounded-2xl p-5 mb-5"
            style={{ background: 'var(--card-bg)', borderLeft: '4px solid var(--blue-accent)' }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--blue-accent)' }}>
              Today&apos;s Market Overview
            </p>
            <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--navy)' }}>
              {overview.text}
            </p>
            {overview.photoUrls && overview.photoUrls.length > 0 && (
              <div className="flex gap-2 mt-2">
                {overview.photoUrls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        )}

        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="motion-lift rounded-2xl p-5 mb-8 flex items-center gap-4"
          style={{
            background: 'linear-gradient(120deg, #e3ebf8 0%, #e8eef9 65%, #f8efd4 100%)',
            borderLeft: '4px solid var(--navy-gold)',
            boxShadow: '0 3px 10px rgba(11,42,85,0.08)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--navy), var(--navy-2))',
              boxShadow: 'inset 0 0 0 1.5px var(--navy-gold-soft)',
            }}
          >
            📄
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'var(--navy-gold-text)' }}>
              Today&apos;s Update
            </p>
            <p className="font-semibold text-sm mb-0.5 truncate" style={{ color: 'var(--navy)' }}>
              {pdfTitle}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
              {pdfSummary}
            </p>
          </div>
          <span
            className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, var(--navy), var(--navy-2))',
              color: '#ffffff',
            }}
          >
            View PDF →
          </span>
        </a>

        {/* Metric tiles — compact, navy + gold border combination */}
        <div
          className="grid grid-cols-3 mb-8 rounded-xl overflow-hidden"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(11,42,85,0.16)',
            borderTop: '3px solid var(--navy-gold)',
          }}
        >
          {[
            { label: 'NIFTY 50', value: '24,312', change: '+0.67%', up: true },
            { label: 'SENSEX', value: '79,845', change: '+0.71%', up: true },
            { label: 'BANK NIFTY', value: '52,189', change: '-0.23%', up: false },
          ].map((s, i) => (
            <div
              key={s.label}
              className={i >= 1 ? 'p-2.5 border-l' : 'p-2.5'}
              style={{ borderColor: 'rgba(11,42,85,0.18)' }}
            >
              <p className="text-[9px] font-medium mb-1 uppercase tracking-wide truncate" style={{ color: 'var(--muted-text)' }}>
                {s.label}
              </p>
              <p
                className="text-sm font-bold mb-1"
                style={{ color: 'var(--navy)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {s.value}
              </p>
              <span
                className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: s.up ? 'var(--gain-bg)' : 'var(--loss-bg)',
                  color: s.up ? 'var(--gain)' : 'var(--loss)',
                }}
              >
                {s.up ? '▲ ' : '▼ '}{s.change}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base" style={{ color: 'var(--navy)' }}>
              Continue learning
            </h2>
            <button
              onClick={() => navigate('courses')}
              className="text-xs font-medium hover:opacity-70"
              style={{ color: 'var(--blue-accent)' }}
            >
              All courses
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredCourses.map(course => (
              <div
                key={course.id}
                className="rounded-2xl overflow-hidden cursor-pointer pressable"
                style={{ background: 'var(--card-bg)' }}
                onClick={() => navigate('course-detail', course.id)}
              >
                <div className="relative h-36 overflow-hidden" style={{ background: 'var(--secondary)' }}>
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  {course.isPro && !isPro && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        background: 'rgba(11,42,85,0.5)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <span
                        className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ background: 'color-mix(in srgb, var(--navy-gold-soft) 25%, transparent)', color: '#f1d27a' }}
                      >
                        Pro
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-semibold line-clamp-2 mb-1" style={{ color: 'var(--navy)' }}>
                    {course.title}
                  </p>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted-text)' }}>
                    <span>{course.lessons} lessons</span>
                    <span>★ {course.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
