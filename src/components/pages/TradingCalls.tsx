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
              className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))',
                color: 'var(--primary-foreground)',
              }}
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
              className="rounded-xl p-4 text-center"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <p
                className="text-2xl font-bold mb-0.5"
                style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace' }}
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
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          {(['All', 'BUY', 'SELL'] as const).map(a => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={{
                background: action === a ? (a === 'BUY' ? 'rgba(14,203,129,0.15)' : a === 'SELL' ? 'rgba(248,113,113,0.15)' : 'var(--secondary)') : 'transparent',
                color: action === a ? (a === 'BUY' ? 'var(--accent)' : a === 'SELL' ? '#f87171' : 'var(--foreground)') : 'var(--muted-foreground)',
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
                background: timeframe === t ? 'var(--card)' : 'transparent',
                color: timeframe === t ? 'var(--foreground)' : 'var(--muted-foreground)',
                border: '1px solid',
                borderColor: timeframe === t ? 'var(--border)' : 'transparent',
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

      {/* Calls grid */}
      <div className="space-y-3">
        {filtered.map(call => {
          const locked = call.isPro && !isPro
          return (
            <div
              key={call.id}
              className="relative rounded-2xl p-5 transition-all"
              style={{
                background: 'var(--card)',
                border: locked ? '1px solid var(--border)' : `1px solid ${call.action === 'BUY' ? 'rgba(14,203,129,0.15)' : 'rgba(248,113,113,0.15)'}`,
                opacity: locked ? 0.75 : 1,
              }}
            >
              {locked && (
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center z-10 cursor-pointer"
                  style={{ background: 'var(--overlay-75)', backdropFilter: 'blur(4px)' }}
                  onClick={onUpgrade}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">🔒</div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                      Pro Content
                    </p>
                    <button
                      className="mt-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                      style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                    >
                      Upgrade to Unlock →
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-4">
                {/* Action badge */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: call.action === 'BUY' ? 'rgba(14,203,129,0.1)' : 'rgba(248,113,113,0.1)',
                    color: call.action === 'BUY' ? 'var(--accent)' : '#f87171',
                    border: `1px solid ${call.action === 'BUY' ? 'rgba(14,203,129,0.2)' : 'rgba(248,113,113,0.2)'}`,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {call.action}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                        {call.stock}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="text-xs font-mono"
                          style={{ color: 'var(--muted-foreground)' }}
                        >
                          {call.symbol}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: 'var(--secondary)',
                            color: 'var(--muted-foreground)',
                          }}
                        >
                          {call.category}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: call.status === 'Active' ? 'rgba(14,203,129,0.08)' : 'var(--primary-08)',
                            color: call.status === 'Active' ? 'var(--accent)' : 'var(--primary)',
                          }}
                        >
                          {call.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p
                        className="text-xl font-bold"
                        style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        +{call.returnsPct}%
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        target return
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'CMP', value: `₹${call.cmp.toLocaleString('en-IN')}` },
                      { label: 'Target', value: `₹${call.target.toLocaleString('en-IN')}`, positive: true },
                      { label: 'Stop Loss', value: `₹${call.stopLoss.toLocaleString('en-IN')}`, negative: true },
                    ].map(p => (
                      <div key={p.label}>
                        <p className="text-xs mb-0.5" style={{ color: 'var(--muted-foreground)' }}>
                          {p.label}
                        </p>
                        <p
                          className="text-sm font-semibold"
                          style={{
                            color: p.positive ? 'var(--accent)' : p.negative ? '#f87171' : 'var(--foreground)',
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {p.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    <span>{call.timeframe}</span>
                    <span>·</span>
                    <span>{call.date}</span>
                  </div>
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
            className="px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))', color: 'var(--primary-foreground)' }}
          >
            Upgrade to Pro · ₹999/month
          </button>
        </div>
      )}
    </div>
  )
}
