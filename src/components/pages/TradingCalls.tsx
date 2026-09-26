"use client";

import { useState } from 'react'
import { tradingCalls, pastPerformances } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

export default function TradingCalls() {
  const { user, onUpgrade } = useAuth();
  const isPro = user?.subscription === 'pro'
  const [view, setView] = useState<'active' | 'past'>('active')

  const activeCalls = tradingCalls.filter(c => c.status === 'Active')
  const lockedCount = view === 'active'
    ? activeCalls.filter(c => c.isPro).length
    : pastPerformances.filter(p => p.isPro).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--blue-accent)' }}>
              Research
            </p>
            <h1
              className="text-3xl font-bold mb-1.5"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--navy)' }}
            >
              Market Insights
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
              Research-backed buy/sell calls with clear targets and stop-losses.
              {!isPro && ' Upgrade to Pro for unlimited access.'}
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

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: 'Active Calls', value: isPro ? activeCalls.length : activeCalls.filter(c => !c.isPro).length },
            { label: 'Achieved This Month', value: pastPerformances.filter(p => p.outcome === 'Target Hit').length },
            { label: 'Avg Target Return', value: `+${(activeCalls.reduce((a, c) => a + c.returnsPct, 0) / activeCalls.length).toFixed(1)}%` },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-4 text-center"
              style={{ background: 'var(--card-bg)', borderTop: '3px solid var(--blue-accent)' }}
            >
              <p
                className="text-2xl font-bold mb-0.5"
                style={{ color: 'var(--navy)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {s.value}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(11,42,85,0.06)', border: '1px solid rgba(29,78,216,0.15)' }}>
          {([
            { key: 'active', label: 'Active Trades' },
            { key: 'past', label: 'Past Performances' },
          ] as const).map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={{
                background: view === v.key ? '#ffffff' : 'transparent',
                color: view === v.key ? 'var(--navy)' : 'var(--muted-text)',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active trades */}
      {view === 'active' && (
      <div className="space-y-3">
        {activeCalls.map(call => {
          const locked = call.isPro && !isPro
          const isBuy = call.action === 'BUY'
          const range = Math.abs(call.target - call.stopLoss) || 1
          const progress = Math.min(
            100,
            Math.max(0, ((call.cmp - Math.min(call.stopLoss, call.target)) / range) * 100),
          )
          const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

          return (
            <div
              key={call.id}
              className="relative rounded-2xl p-4 sm:p-5 transition-all"
              style={{
                background: 'linear-gradient(150deg, #eef3fb, #e3ebf8)',
                border: '1px solid rgba(29,78,216,0.2)',
                opacity: locked ? 0.75 : 1,
              }}
            >
              {locked && (
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center z-10 cursor-pointer"
                  style={{
                    background: 'color-mix(in srgb, var(--screen-bg) 65%, transparent)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                  }}
                  onClick={onUpgrade}
                >
                  <div className="text-center">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--navy)' }}>
                      Pro Content
                    </p>
                    <button className="btn-pro mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold">
                      Upgrade to Unlock →
                    </button>
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-md"
                      style={{
                        background: isBuy ? 'var(--buy-badge)' : 'var(--sell-badge)',
                        color: '#ffffff',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {call.action}
                    </span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                      style={{
                        background: call.status === 'Active'
                          ? 'color-mix(in srgb, var(--blue-accent) 12%, transparent)'
                          : 'color-mix(in srgb, var(--blue-accent) 6%, transparent)',
                        color: 'var(--blue-accent)',
                      }}
                    >
                      {call.status}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted-text)' }}>
                      {call.category} · {call.timeframe}
                    </span>
                  </div>
                  <h3 className="font-bold text-base leading-tight truncate" style={{ color: 'var(--navy)' }}>
                    {call.stock}
                  </h3>
                  <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted-text)' }}>
                    {call.symbol} · {call.date}
                  </p>
                </div>

                <div
                  className="flex-shrink-0 text-right px-3 py-2 rounded-xl"
                  style={{ background: 'var(--gain-bg)' }}
                >
                  <p
                    className="text-lg font-bold leading-none"
                    style={{ color: 'var(--gain)', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {call.returnsPct > 0 ? '+' : ''}{call.returnsPct}%
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--gain)', opacity: 0.75 }}>
                    expected
                  </p>
                </div>
              </div>

              {/* Price ladder */}
              <div
                className="rounded-xl px-3.5 py-3 mb-3"
                style={{ background: 'rgba(11,42,85,0.06)', border: '1px solid rgba(29,78,216,0.15)' }}
              >
                <div className="flex items-end justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--muted-text)' }}>
                      Stop loss
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--loss)', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {fmt(call.stopLoss)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--muted-text)' }}>
                      CMP
                    </p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: 'var(--navy)', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {fmt(call.cmp)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--muted-text)' }}>
                      Target
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--gain)', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {fmt(call.target)}
                    </p>
                  </div>
                </div>

                <div
                  className="relative h-2 rounded-full overflow-hidden"
                  style={{ background: 'rgba(11,42,85,0.1)' }}
                  aria-hidden
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: '100%',
                      background: isBuy
                        ? 'linear-gradient(90deg, #f87171, #4ade80)'
                        : 'linear-gradient(90deg, #4ade80, #f87171)',
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full"
                    style={{
                      left: `calc(${progress}% - 7px)`,
                      background: 'var(--navy)',
                      border: '2.5px solid #fff',
                      boxShadow: '0 0 0 2px rgba(11,42,85,0.28), 0 1px 3px rgba(11,42,85,0.25)',
                    }}
                    title="CMP"
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Past performances */}
      {view === 'past' && (
        <div className="space-y-3">
          {pastPerformances.map(perf => {
            const locked = perf.isPro && !isPro
            const isBuy = perf.action === 'BUY'
            const isProfit = perf.returnsPct >= 0
            const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

            return (
              <div
                key={perf.id}
                className="relative rounded-2xl p-4 sm:p-5 transition-all"
                style={{
                  background: 'linear-gradient(150deg, #eef3fb, #e3ebf8)',
                  border: '1px solid rgba(29,78,216,0.2)',
                  opacity: locked ? 0.75 : 1,
                }}
              >
                {locked && (
                  <div
                    className="absolute inset-0 rounded-2xl flex items-center justify-center z-10 cursor-pointer"
                    style={{
                      background: 'color-mix(in srgb, var(--screen-bg) 65%, transparent)',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                    }}
                    onClick={onUpgrade}
                  >
                    <div className="text-center">
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--navy)' }}>
                        Pro Content
                      </p>
                      <button className="btn-pro mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold">
                        Upgrade to Unlock →
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-md"
                        style={{
                          background: isBuy ? 'var(--buy-badge)' : 'var(--sell-badge)',
                          color: '#ffffff',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {perf.action}
                      </span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                        style={{
                          background: perf.outcome === 'Target Hit' ? 'var(--gain-bg)' : 'var(--loss-bg)',
                          color: perf.outcome === 'Target Hit' ? 'var(--gain)' : 'var(--loss)',
                        }}
                      >
                        {perf.outcome}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--muted-text)' }}>
                        {perf.duration} · Closed {perf.closedDate}
                      </span>
                    </div>
                    <h3 className="font-bold text-base leading-tight truncate" style={{ color: 'var(--navy)' }}>
                      {perf.stock}
                    </h3>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted-text)' }}>
                      {perf.symbol} · Entry {fmt(perf.entryPrice)} → Exit {fmt(perf.exitPrice)}
                    </p>
                  </div>

                  <div
                    className="flex-shrink-0 text-right px-3 py-2 rounded-xl"
                    style={{ background: isProfit ? 'var(--gain-bg)' : 'var(--loss-bg)' }}
                  >
                    <p
                      className="text-lg font-bold leading-none"
                      style={{ color: isProfit ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {perf.returnsPct > 0 ? '+' : ''}{perf.returnsPct}%
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: isProfit ? 'var(--gain)' : 'var(--loss)', opacity: 0.75 }}>
                      realised
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isPro && (
        <div
          className="mt-6 rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(135deg, #e3ebf8 0%, #f8efd4 100%)',
            border: '1px dashed rgba(201,162,39,0.4)',
          }}
        >
          <p className="text-2xl mb-2">🔒</p>
          <p className="font-bold mb-1" style={{ color: 'var(--navy)' }}>
            {lockedCount} more {view === 'active' ? 'research ideas' : 'past performance records'} available on Pro
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-text)' }}>
            Get unlimited access to all market insights and premium courses.
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
