"use client";

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from "@/lib/auth-context";
import { listInsights, type Insight } from "@/lib/api";

type ViewKey = 'live' | 'past' | 'closed'
type InstrumentFilter = 'equity' | 'fno'

// view is fixed per route now — Today's/Past/Closed Trade are separate top-
// level nav tabs (src/components/Navbar.tsx), not an in-page toggle, so each
// page wrapper (src/app/trading, /past-trade, /closed-trade) just picks
// which one this instance renders.
const pageTitle: Record<ViewKey, string> = {
  live: "Today's Trade",
  past: 'Past Trade',
  closed: 'Closed Trades',
}

// "Today" per the RA's own spec: a call published today (UTC, matching
// when the backend stamps publishedAt) and not yet closed is Live; the
// same call is still Live at 11:59pm and becomes Past the instant the UTC
// date rolls over, regardless of local IST time — simplest unambiguous
// rule, and the backend's own dates are all UTC already.
function isTodayUTC(iso: string): boolean {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  )
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`
const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TradingCalls({ view }: { view: ViewKey }) {
  const { withAuth } = useAuth();
  const [instrument, setInstrument] = useState<InstrumentFilter>('equity')
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    withAuth((token) => listInsights(token))
      .then((data) => { if (!cancelled) { setInsights(data); setError('') } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load insights') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [withAuth])

  const byInstrument = useMemo(
    () => insights.filter(c => c.instrumentType === instrument),
    [insights, instrument],
  )
  const liveCalls = useMemo(
    () => byInstrument.filter(c => c.tradeStatus === 'open' && isTodayUTC(c.date)),
    [byInstrument],
  )
  const pastCalls = useMemo(
    () => byInstrument.filter(c => c.tradeStatus === 'open' && !isTodayUTC(c.date)),
    [byInstrument],
  )
  const closedCalls = useMemo(
    () => byInstrument.filter(c => c.tradeStatus === 'closed'),
    [byInstrument],
  )

  const visible = view === 'live' ? liveCalls : view === 'past' ? pastCalls : closedCalls
  const emptyMessage = view === 'live'
    ? "No live trades published today — check back soon."
    : view === 'past'
      ? "No past open trades right now."
      : "No closed trades yet."

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--blue-accent)' }}>
          Research
        </p>
        <h1
          className="text-3xl font-bold mb-1.5"
          style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--navy)' }}
        >
          {pageTitle[view]}
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
          Research-backed buy/sell calls with clear targets and stop-losses.
        </p>
      </div>

      {/* Equity / F&O filter — applies across Live, Past, and Closed alike */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(11,42,85,0.06)', border: '1px solid rgba(29,78,216,0.15)' }} role="radiogroup" aria-label="Instrument type">
          {([
            { key: 'equity', label: 'Equity' },
            { key: 'fno', label: 'F&O' },
          ] as const).map(i => (
            <button
              key={i.key}
              role="radio"
              aria-checked={instrument === i.key}
              onClick={() => setInstrument(i.key)}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={{
                background: instrument === i.key ? 'var(--navy)' : 'transparent',
                color: instrument === i.key ? '#ffffff' : 'var(--muted-text)',
              }}
            >
              {i.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--muted-text)' }}>
          Loading insights…
        </p>
      )}
      {!loading && error && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--loss)' }}>
          {error}
        </p>
      )}
      {!loading && !error && visible.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--muted-text)' }}>
          {emptyMessage}
        </p>
      )}

      {/* Live / Past — open trades, same card shape */}
      {!loading && !error && visible.length > 0 && view !== 'closed' && (
        <div className="space-y-3">
          {visible.map(call => {
            const isBuy = call.action === 'BUY'
            const isFno = call.instrumentType === 'fno'
            const targets = call.targets ?? []
            const entryMid = (call.entryPriceLow + call.entryPriceHigh) / 2
            const primaryTarget = targets[0] ?? entryMid
            const range = Math.abs(primaryTarget - call.stopLoss) || 1
            const progress = Math.min(
              100,
              Math.max(0, ((entryMid - Math.min(call.stopLoss, primaryTarget)) / range) * 100),
            )

            return (
              <div
                key={call.id}
                className="relative rounded-2xl p-4 sm:p-5 transition-all"
                style={{
                  background: 'linear-gradient(150deg, #eef3fb, #e3ebf8)',
                  border: '1px solid rgba(29,78,216,0.2)',
                }}
              >
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
                      <span className="text-[10px]" style={{ color: 'var(--muted-text)' }}>
                        {call.timeframe || (isFno ? 'Intraday' : '')}
                      </span>
                    </div>
                    <h3 className="font-bold text-base leading-tight truncate" style={{ color: 'var(--navy)' }}>
                      {call.stock}
                    </h3>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted-text)' }}>
                      {call.symbol} · {fmtDate(call.date)}
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
                        Entry
                      </p>
                      <p
                        className="text-sm font-bold"
                        style={{ color: 'var(--navy)', fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {call.entryPriceLow === call.entryPriceHigh
                          ? fmt(call.entryPriceLow)
                          : `₹${call.entryPriceLow.toLocaleString('en-IN')}-${call.entryPriceHigh.toLocaleString('en-IN')}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--muted-text)' }}>
                        {isFno && targets.length > 1 ? 'Target 1' : 'Target'}
                      </p>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--gain)', fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {fmt(primaryTarget)}
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
                      title="Entry price"
                    />
                  </div>

                  {isFno && targets.length > 1 && (
                    <div className="flex items-center gap-2 mt-2.5 pt-2.5" style={{ borderTop: '1px dashed rgba(29,78,216,0.15)' }}>
                      {targets.slice(1).map((t, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-semibold px-2 py-1 rounded-md"
                          style={{ background: 'var(--gain-bg)', color: 'var(--gain)', fontFamily: 'JetBrains Mono, monospace' }}
                        >
                          T{i + 2} {fmt(t)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Closed — resolved trades, outcome instead of a live progress bar */}
      {!loading && !error && visible.length > 0 && view === 'closed' && (
        <div className="space-y-3">
          {visible.map(call => {
            const isBuy = call.action === 'BUY'
            const isTargetHit = call.outcome === 'target_hit'
            const hitIdx = call.targetHitIndex ?? 0
            const entryMid = (call.entryPriceLow + call.entryPriceHigh) / 2
            const exitPrice = isTargetHit ? (call.targets?.[hitIdx] ?? entryMid) : call.stopLoss
            const targetLabel = (call.targets?.length ?? 0) > 1 ? `Target ${hitIdx + 1}` : 'Target'
            const entryLabel =
              call.entryPriceLow === call.entryPriceHigh
                ? fmt(call.entryPriceLow)
                : `₹${call.entryPriceLow.toLocaleString('en-IN')}-${call.entryPriceHigh.toLocaleString('en-IN')}`

            return (
              <div
                key={call.id}
                className="relative rounded-2xl p-4 sm:p-5 transition-all"
                style={{
                  background: 'linear-gradient(150deg, #eef3fb, #e3ebf8)',
                  border: '1px solid rgba(29,78,216,0.2)',
                }}
              >
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
                        {call.action}
                      </span>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                        style={{
                          background: isTargetHit ? 'var(--gain-bg)' : 'var(--loss-bg)',
                          color: isTargetHit ? 'var(--gain)' : 'var(--loss)',
                        }}
                      >
                        {isTargetHit ? `${targetLabel} Hit` : 'SL Hit'}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--muted-text)' }}>
                        Published {fmtDate(call.date)}{call.closedAt && ` · Closed ${fmtDate(call.closedAt)}`}
                      </span>
                    </div>
                    <h3 className="font-bold text-base leading-tight truncate" style={{ color: 'var(--navy)' }}>
                      {call.stock}
                    </h3>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--muted-text)' }}>
                      {call.symbol} · Entry {entryLabel} → {isTargetHit ? targetLabel : 'SL'} {fmt(exitPrice)}
                    </p>
                  </div>

                  <div
                    className="flex-shrink-0 text-right px-3 py-2 rounded-xl"
                    style={{ background: isTargetHit ? 'var(--gain-bg)' : 'var(--loss-bg)' }}
                  >
                    <p
                      className="text-lg font-bold leading-none"
                      style={{ color: isTargetHit ? 'var(--gain)' : 'var(--loss)', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      {call.returnsPct > 0 ? '+' : ''}{call.returnsPct}%
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: isTargetHit ? 'var(--gain)' : 'var(--loss)', opacity: 0.75 }}>
                      realised
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
