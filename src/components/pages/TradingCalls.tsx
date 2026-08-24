"use client";

import { useState } from 'react'
import { tradingCalls } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

const categories = ['All', 'Large Cap', 'Banking', 'IT', 'Auto', 'NBFC', 'Infrastructure']
const timeframes = ['All', 'Short Term', 'Medium Term', 'Long Term']

export default function TradingCalls() {
  const { user, onUpgrade } = useAuth();
  const isPro = user?.subscription === 'pro'
  const [category, setCategory] = useState('All')
  const [timeframe, setTimeframe] = useState('All')
  const [action, setAction] = useState<'All' | 'BUY' | 'SELL'>('All')

  const filtered = tradingCalls.filter(c => {
    if (category !== 'All' && c.category !== category) return false
    if (timeframe !== 'All' && c.timeframe !== timeframe) return false
    if (action !== 'All' && c.action !== action) return false
    return true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--primary)' }}>
              Research
            </p>
            <h1
              className="text-3xl font-bold mb-1.5"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
            >
              Market Insights
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
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
            { label: 'Active Calls', value: isPro ? tradingCalls.filter(c => c.status === 'Active').length : tradingCalls.filter(c => c.status === 'Active' && !c.isPro).length },
            { label: 'Achieved This Month', value: tradingCalls.filter(c => c.status === 'Achieved').length },
            { label: 'Avg Target Return', value: `+${(tradingCalls.reduce((a, c) => a + c.returnsPct, 0) / tradingCalls.length).toFixed(1)}%` },
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
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
          {(['All', 'BUY', 'SELL'] as const).map(a => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={{
                background: action === a
                  ? (a === 'BUY'
                    ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
                    : a === 'SELL'
                      ? 'color-mix(in srgb, var(--destructive) 12%, transparent)'
                      : 'var(--secondary)')
                  : 'transparent',
                color: action === a
                  ? (a === 'BUY' ? 'var(--accent)' : a === 'SELL' ? 'var(--destructive)' : 'var(--foreground)')
                  : 'var(--muted-foreground)',
              }}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {timeframes.map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: timeframe === t ? 'var(--surface-secondary)' : 'transparent',
                color: timeframe === t ? 'var(--foreground)' : 'var(--muted-foreground)',
                border: `1px solid ${timeframe === t ? 'var(--border)' : 'transparent'}`,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6" style={{ scrollbarWidth: 'none' }}>
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

      {/* Calls grid */}
      <div className="space-y-3">
        {filtered.map(call => {
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
              className="surface-card relative rounded-2xl p-4 sm:p-5 transition-all"
              style={{
                background: 'var(--surface-secondary)',
                border: locked
                  ? '1px solid color-mix(in srgb, #0b2438 14%, transparent)'
                  : `1px solid ${isBuy ? 'color-mix(in srgb, var(--accent) 22%, transparent)' : 'color-mix(in srgb, var(--destructive) 22%, transparent)'}`,
                opacity: locked ? 0.75 : 1,
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
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
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
                        background: isBuy
                          ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
                          : 'color-mix(in srgb, var(--destructive) 12%, transparent)',
                        color: isBuy ? 'var(--accent)' : 'var(--destructive)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {call.action}
                    </span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                      style={{
                        background: call.status === 'Active'
                          ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                          : 'var(--primary-08)',
                        color: call.status === 'Active' ? 'var(--accent)' : 'var(--primary)',
                      }}
                    >
                      {call.status}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                      {call.category} · {call.timeframe}
                    </span>
                  </div>
                  <h3 className="font-bold text-base leading-tight truncate" style={{ color: 'var(--foreground)' }}>
                    {call.stock}
                  </h3>
                  <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted-foreground)' }}>
                    {call.symbol} · {call.date}
                  </p>
                </div>

                <div
                  className="flex-shrink-0 text-right px-3 py-2 rounded-xl"
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--accent) 22%, transparent)',
                  }}
                >
                  <p
                    className="delta-up text-lg font-bold leading-none"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {call.returnsPct > 0 ? '+' : ''}{call.returnsPct}%
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--muted-foreground)' }}>
                    expected
                  </p>
                </div>
              </div>

              {/* Price ladder */}
              <div
                className="rounded-xl px-3.5 py-3 mb-3"
                style={{ background: 'var(--surface-inset)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-end justify-between gap-2 mb-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      Stop loss
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--destructive)', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {fmt(call.stopLoss)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      CMP
                    </p>
                    <p
                      className="text-sm font-bold"
                      style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {fmt(call.cmp)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--muted-foreground)' }}>
                      Target
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {fmt(call.target)}
                    </p>
                  </div>
                </div>

                <div
                  className="relative h-2 rounded-full overflow-hidden"
                  style={{ background: 'color-mix(in srgb, #0b2438 10%, transparent)' }}
                  aria-hidden
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: '100%',
                      background: isBuy
                        ? 'linear-gradient(90deg, color-mix(in srgb, var(--destructive) 35%, transparent), color-mix(in srgb, var(--accent) 45%, transparent))'
                        : 'linear-gradient(90deg, color-mix(in srgb, var(--accent) 35%, transparent), color-mix(in srgb, var(--destructive) 45%, transparent))',
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full"
                    style={{
                      left: `calc(${progress}% - 7px)`,
                      background: 'var(--foreground)',
                      border: '2.5px solid #fff',
                      boxShadow: '0 0 0 2px color-mix(in srgb, #0b2438 28%, transparent), 0 1px 3px rgba(11,36,56,0.25)',
                    }}
                    title="CMP"
                  />
                </div>
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
          <p className="text-2xl mb-2">🔒</p>
          <p className="font-bold mb-1" style={{ color: 'var(--foreground)' }}>
            {tradingCalls.filter(c => c.isPro).length} more research ideas available on Pro
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Get unlimited access to all market insights, MF alerts, and premium courses.
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
