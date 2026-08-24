"use client";

import { useState } from 'react'
import { mfAlerts } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

const categories = ['All', 'Small Cap', 'Large Cap', 'Mid Cap', 'Flexi Cap', 'Index']
const actions = ['All', 'INVEST', 'SIP', 'SWITCH']

const actionColors: Record<string, { bg: string; text: string }> = {
  INVEST: { bg: 'color-mix(in srgb, var(--accent) 14%, transparent)', text: 'var(--accent)' },
  SIP: { bg: 'color-mix(in srgb, var(--primary) 14%, transparent)', text: 'var(--primary)' },
  SWITCH: { bg: 'var(--primary-12)', text: 'var(--primary)' },
}

export default function MFAlerts() {
  const { user, onUpgrade } = useAuth();
  const isPro = user?.subscription === 'pro'
  const [category, setCategory] = useState('All')
  const [action, setAction] = useState('All')

  const filtered = mfAlerts.filter(a => {
    if (category !== 'All' && a.category !== category) return false
    if (action !== 'All' && a.action !== action) return false
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--primary)' }}>
              Mutual Funds
            </p>
            <h1
              className="text-3xl font-bold mb-1.5"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
            >
              MF Alerts
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Curated invest, SIP, and switch alerts on top-performing mutual funds.
            </p>
          </div>
          {!isPro && (
            <button
              onClick={onUpgrade}
              className="btn-pro flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              ✦ Unlock All
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: 'Total Alerts', value: isPro ? mfAlerts.length : mfAlerts.filter(a => !a.isPro).length },
            { label: 'INVEST Alerts', value: mfAlerts.filter(a => a.action === 'INVEST').length },
            { label: 'Avg 1Y Returns', value: `+${(mfAlerts.reduce((acc, a) => acc + a.returns1Y, 0) / mfAlerts.length).toFixed(1)}%` },
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
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {actions.map(a => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: action === a ? (a !== 'All' ? (actionColors[a]?.bg || 'var(--surface-secondary)') : 'var(--surface-secondary)') : 'transparent',
              color: action === a ? (a !== 'All' ? (actionColors[a]?.text || 'var(--foreground)') : 'var(--foreground)') : 'var(--muted-foreground)',
              border: `1px solid ${action === a ? 'var(--border)' : 'transparent'}`,
            }}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'none' }}>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: category === c ? 'var(--primary-12)' : 'var(--surface-secondary)',
              color: category === c ? 'var(--primary)' : 'var(--muted-foreground)',
              border: `1px solid ${category === c ? 'var(--primary-30)' : 'var(--border)'}`,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Alerts */}
      <div className="space-y-4">
        {filtered.map(alert => {
          const locked = alert.isPro && !isPro
          const ac = actionColors[alert.action] || { bg: 'var(--secondary)', text: 'var(--foreground)' }
          return (
            <div
              key={alert.id}
              className="surface-card relative rounded-2xl p-6 transition-all"
              style={{
                background: 'var(--surface-secondary)',
                opacity: locked ? 0.7 : 1,
              }}
            >
              {locked && (
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center z-10 cursor-pointer"
                  style={{
                    background: 'color-mix(in srgb, var(--surface) 55%, transparent)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                  }}
                  onClick={onUpgrade}
                >
                  <div className="text-center">
                    <p className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                      Pro Exclusive
                    </p>
                    <button className="btn-pro px-4 py-1.5 rounded-lg text-xs font-semibold">
                      Upgrade to Unlock
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: ac.bg,
                      color: ac.text,
                      border: `1px solid ${ac.text}30`,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {alert.action}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-snug mb-1" style={{ color: 'var(--foreground)' }}>
                      {alert.fund.split(' – ')[0]}
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {alert.fund.split(' – ')[1]} · {alert.amc}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                      >
                        {alert.category}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {'★'.repeat(alert.rating)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Returns */}
                <div className="text-right flex-shrink-0">
                  <p
                    className="text-xl font-bold mb-0.5"
                    style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    +{alert.returns1Y}%
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    1Y returns
                  </p>
                  <p
                    className="text-sm font-semibold mt-0.5"
                    style={{ color: 'var(--secondary-foreground)', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    +{alert.returns3Y}%
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    3Y returns
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'NAV', value: `₹${alert.nav}` },
                  { label: 'Min SIP', value: `₹${alert.minSIP}` },
                  { label: 'Date', value: alert.date },
                ].map(p => (
                  <div key={p.label}>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      {p.label}
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{
                        color: 'var(--foreground)',
                        fontFamily: p.label !== 'Date' ? 'JetBrains Mono, monospace' : 'inherit',
                      }}
                    >
                      {p.value}
                    </p>
                  </div>
                ))}
              </div>

              <div
                className="mt-4 pt-4 text-sm leading-relaxed"
                style={{
                  borderTop: '1px solid var(--border)',
                  color: 'var(--secondary-foreground)',
                }}
              >
                <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                  Why now:{' '}
                </span>
                {alert.reason}
              </div>
            </div>
          )
        })}
      </div>

      {!isPro && (
        <div
          className="mt-6 rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(135deg, var(--primary-06) 0%, var(--primary-02) 100%)',
            border: '1px dashed var(--primary-30)',
          }}
        >
          <p className="text-2xl mb-2">📊</p>
          <p className="font-bold mb-1" style={{ color: 'var(--foreground)' }}>
            {mfAlerts.filter(a => a.isPro).length} more alerts available on Pro
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Including high-alpha small cap picks, index funds, and flexi cap alerts.
          </p>
          <button
            onClick={onUpgrade}
            className="btn-pro px-6 py-2.5 rounded-xl font-semibold text-sm"
          >
            Upgrade to Pro · ₹999/month
          </button>
        </div>
      )}
    </div>
  )
}
