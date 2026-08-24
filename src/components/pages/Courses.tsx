"use client";

import { useState } from 'react'
import { courses } from "@/lib/data"
import CourseSlider from "@/components/CourseSlider";
import { useAuth } from "@/lib/auth-context"

const levels = ['All', 'Beginner', 'Intermediate', 'Advanced']
const cats = ['All', 'Technical Analysis', 'Mutual Funds', 'Derivatives', 'Personal Finance']

export default function Courses() {
  const { user, onUpgrade } = useAuth();
  const isPro = user?.subscription === 'pro'
  const [level, setLevel] = useState('All')
  const [cat, setCat] = useState('All')

  const filtered = courses.filter(c => {
    if (level !== 'All' && c.level !== level) return false
    if (cat !== 'All' && c.category !== cat) return false
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--primary)' }}>
              Education
            </p>
            <h1
              className="text-3xl font-bold mb-1.5"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
            >
              Online Courses
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Structured courses from beginner to advanced, taught by certified experts.
            </p>
          </div>
          {!isPro && (
            <button
              onClick={onUpgrade}
              className="btn-pro flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              ✦ Get All Courses
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: 'Total Courses', value: courses.length + '+' },
            { label: 'Total Learners', value: '70K+' },
            { label: 'Free Courses', value: courses.filter(c => !c.isPro).length },
          ].map(s => (
            <div
              key={s.label}
              className="surface-card rounded-xl p-4 text-center"
              style={{ borderTop: '3px solid var(--primary)' }}
            >
              <p
                className="text-2xl font-bold mb-0.5"
                style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {s.value}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {levels.map(l => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: level === l ? 'var(--surface-secondary)' : 'transparent',
              color: level === l ? 'var(--foreground)' : 'var(--muted-foreground)',
              border: `1px solid ${level === l ? 'var(--border)' : 'transparent'}`,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8" style={{ scrollbarWidth: 'none' }}>
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: cat === c ? 'var(--primary-12)' : 'var(--surface-secondary)',
              color: cat === c ? 'var(--primary)' : 'var(--muted-foreground)',
              border: `1px solid ${cat === c ? 'var(--primary-30)' : 'var(--border)'}`,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <CourseSlider items={filtered} />

      {!isPro && (
        <div
          className="mt-10 rounded-2xl p-8 text-center"
          style={{
            background: 'linear-gradient(160deg, var(--primary-06) 0%, transparent 100%)',
            border: '1px dashed var(--primary-30)',
          }}
        >
          <p className="text-3xl mb-3">🎓</p>
          <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}>
            Unlock all {courses.filter(c => c.isPro).length} Pro courses
          </h3>
          <p className="text-sm mb-5" style={{ color: 'var(--muted-foreground)' }}>
            Technical Analysis, Options Fundamentals, and more — all included in Pro.
          </p>
          <button
            onClick={onUpgrade}
            className="btn-pro px-8 py-3 rounded-xl font-semibold text-sm"
          >
            Upgrade to Pro · ₹999/month
          </button>
        </div>
      )}
    </div>
  )
}
