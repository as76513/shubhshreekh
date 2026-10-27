"use client";

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
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

function hitTarget(call: Insight): boolean {
  if (call.outcome === 'sl_hit') return false
  if (call.outcome === 'target_hit') return true
  if ((call.targetHitAt ?? []).some(Boolean)) return true
  return call.instrumentType === 'scalping' && call.tradeStatus === 'closed'
}

type WindowKind = 'fno' | 'scalping'

const windowKinds: { key: WindowKind; label: string }[] = [
  { key: 'fno', label: 'F&O' },
  { key: 'scalping', label: 'Scalping' },
]

function closedEquityScore(insights: Insight[]) {
  let presented = 0
  let hits = 0
  for (const call of insights) {
    if (call.instrumentType !== 'equity' || call.tradeStatus !== 'closed') continue
    presented += 1
    if (hitTarget(call)) hits += 1
  }
  const pct = presented === 0 ? null : Math.round((hits / presented) * 100)
  return { presented, hits, pct }
}

function fortnightScore(insights: Insight[], instrument: WindowKind, now = Date.now()) {
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  start.setUTCDate(start.getUTCDate() - 14)
  const from = start.getTime()
  let presented = 0
  let hits = 0
  for (const call of insights) {
    if (call.instrumentType !== instrument) continue
    const published = new Date(call.date)
    if (Number.isNaN(published.getTime()) || published.getTime() < from) continue
    presented += 1
    if (hitTarget(call)) hits += 1
  }
  const pct = presented === 0 ? null : Math.round((hits / presented) * 100)
  return { presented, hits, pct }
}

const scoreTile: CSSProperties = {
  background: '#fffdf8',
  border: '1px solid rgba(11,36,56,0.08)',
  boxShadow: 'inset 0 3px 0 #d4af37',
}

function RateTile({ label, note, emptyLine, presented, hits, pct }: { label: string; note: string; emptyLine: string; presented: number; hits: number; pct: number | null }) {
  const rate = pct ?? 0
  const line = pct === null ? emptyLine : `${hits} of ${presented} hit the target`
  return (
    <div className="flex h-full min-w-0 flex-col rounded-xl px-3 py-3" style={scoreTile}>
      <p className="text-sm font-semibold" style={{ color: '#9a6b12' }}>{label}</p>
      <p className="text-xs" style={{ color: '#64748b' }}>{note}</p>
      <p className="mt-1 text-4xl font-bold leading-none" style={{ color: '#0b2438', fontFamily: 'DM Serif Display, serif' }}>
        {pct === null ? '—' : `${pct}%`}
      </p>
      <p className="mt-2 text-sm" style={{ color: '#334155' }}>{line}</p>
      <div className="mt-auto flex h-14 items-end gap-1 pt-3" role="img" aria-label={pct === null ? `${label}: no calls yet` : `${label}: ${pct} percent hit the target`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${46 + i * 6}%`,
              background: pct !== null && i * 10 < rate ? '#16a34a' : '#e7d7a8',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function FortnightBanner({ insights }: { insights: Insight[] }) {
  return (
    <section className="mb-5" aria-label="Hit rates">
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-3">
        <RateTile label="Equity" note="All closed calls" emptyLine="No closed calls yet" {...closedEquityScore(insights)} />
        {windowKinds.map((kind) => (
          <RateTile key={kind.key} label={kind.label} note="Last 15 days" emptyLine="No calls in the last 15 days" {...fortnightScore(insights, kind.key)} />
        ))}
      </div>
    </section>
  )
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`
const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      })
}

const INDEX_LABEL: Record<string, string> = {
  nifty: 'Nifty',
  banknifty: 'Bank Nifty',
  sensex: 'Sensex',
}

const plate: CSSProperties = {
  background:
    'radial-gradient(ellipse 90% 80% at 0% 0%, rgba(232,184,74,0.2), transparent 46%), radial-gradient(ellipse 70% 90% at 100% 110%, rgba(15,118,110,0.45), transparent 52%), linear-gradient(160deg, #14324a 0%, #0b2438 58%, #0f2f2c 100%)',
  border: '1px solid rgba(232,184,74,0.45)',
  boxShadow: '0 0 28px rgba(232,184,74,0.12), 0 18px 36px rgba(7,26,42,0.22)',
}

type RailTone = 'sl' | 'entry' | 'target'

function tradeNodes(call: Insight, open: boolean): { key: string; label: string; value: string; tone: RailTone; hot: boolean; dim: boolean }[] {
  const targets = call.targets ?? []
  const entry =
    call.entryPriceLow === call.entryPriceHigh
      ? fmt(call.entryPriceLow)
      : `₹${call.entryPriceLow.toLocaleString('en-IN')}–${call.entryPriceHigh.toLocaleString('en-IN')}`
  const hits = call.targetHitAt ?? []
  const slHit = !open && call.outcome === 'sl_hit'
  const hitIdx = call.outcome === 'target_hit' ? (call.targetHitIndex ?? 0) : -1
  const nodes: { key: string; label: string; value: string; tone: RailTone; hot: boolean; dim: boolean }[] = [
    { key: 'sl', label: 'SL', value: fmt(call.stopLoss), tone: 'sl', hot: slHit, dim: !open && !slHit },
    { key: 'en', label: 'Entry', value: entry, tone: 'entry', hot: open, dim: false },
  ]
  targets.forEach((t, i) => {
    const reached = hitIdx >= i || Boolean(hits[i])
    nodes.push({
      key: `t${i}`,
      label: targets.length > 1 ? `T${i + 1}` : 'Target',
      value: fmt(t),
      tone: 'target',
      hot: reached,
      dim: !open && !reached,
    })
  })
  return nodes
}

function railPath(lifts: number[]) {
  const pts = lifts.map((lift, i) => ({ x: (i + 0.5) * 100, y: lift + 8 }))
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const mx = (a.x + b.x) / 2
    d += ` C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`
  }
  return d
}

function LevelRail({ nodes }: { nodes: { key: string; label: string; value: string; tone: RailTone; hot: boolean; dim: boolean }[] }) {
  const n = nodes.length
  const lifts = nodes.map((_, i) => (n <= 1 ? 0 : Math.round((1 - i / (n - 1)) * 12)))
  const toneColor = (tone: RailTone) => (tone === 'sl' ? '#fca5a5' : tone === 'entry' ? '#f6e7b4' : '#86efac')
  const dot = (tone: RailTone, hot: boolean, dim: boolean): CSSProperties => {
    const color = tone === 'sl' ? '#f87171' : tone === 'entry' ? '#e8b84a' : '#4ade80'
    const glow = tone === 'sl' ? 'rgba(248,113,113,0.85)' : tone === 'entry' ? 'rgba(232,184,74,0.9)' : 'rgba(74,222,128,0.85)'
    const size = tone === 'entry' ? 16 : 12
    return {
      width: size,
      height: size,
      background: color,
      opacity: dim ? 0.35 : 1,
      boxShadow: hot ? `0 0 0 6px color-mix(in srgb, ${color} 28%, transparent), 0 0 18px ${glow}` : `0 0 10px ${glow}`,
      animation: hot ? 'trade-glow 2.4s ease-in-out infinite' : undefined,
    }
  }
  return (
    <div className="relative">
      {n > 1 && (
        <svg
          className="pointer-events-none absolute left-0 right-0 top-0 w-full"
          style={{ height: 28 }}
          viewBox={`0 0 ${n * 100} 28`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={railPath(lifts)} fill="none" stroke="#e8b84a" strokeWidth="7" opacity="0.28" vectorEffect="non-scaling-stroke" />
          <path d={railPath(lifts)} fill="none" stroke="#f6e7b4" strokeWidth="1.6" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {nodes.map((node, i) => (
          <div key={node.key} className="flex min-w-0 flex-col items-center" style={{ paddingTop: lifts[i] }}>
            <span className="flex h-[18px] w-[18px] items-center justify-center">
              <span className="rounded-full" style={dot(node.tone, node.hot, node.dim)} />
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: toneColor(node.tone), opacity: node.dim ? 0.55 : 1 }}>
              {node.label}
            </span>
            <span
              className="mt-0.5 max-w-full break-all text-center text-[11px] font-semibold leading-tight sm:text-[13px]"
              style={{ color: '#fffaf3', fontFamily: 'JetBrains Mono, monospace', opacity: node.dim ? 0.55 : 1 }}
            >
              {node.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TradeTimes({ call }: { call: Insight }) {
  const hits = call.targetHitAt ?? []
  const multi = (call.targets?.length ?? 0) > 1
  const lines: { key: string; text: string }[] = []
  if (call.date) lines.push({ key: 'published', text: `Published ${fmtDateTime(call.date)}` })
  hits.forEach((at, i) => {
    if (!at || at === call.closedAt) return
    lines.push({
      key: `hit-${i}`,
      text: `${multi ? `T${i + 1} hit` : 'Target hit'} ${fmtDateTime(at)}`,
    })
  })
  if (call.tradeStatus === 'closed' && call.closedAt) {
    const label = call.outcome === 'sl_hit' ? 'SL hit' : 'Closed'
    lines.push({ key: 'closed', text: `${label} ${fmtDateTime(call.closedAt)}` })
  }
  if (lines.length === 0) return null
  return (
    <div className="mt-2 pt-2 space-y-0.5" style={{ borderTop: '1px dashed rgba(232,184,74,0.35)' }}>
      {lines.map(line => (
        <p key={line.key} className="text-[11px]" style={{ color: '#c5d4e4' }}>
          {line.text}
        </p>
      ))}
    </div>
  )
}

function ReturnChip({ pct, closed }: { pct: number; closed: boolean }) {
  const up = pct >= 0
  const color = up ? '#86efac' : '#fca5a5'
  return (
    <div
      className="flex-shrink-0 rounded-full px-3 py-1.5 text-right"
      style={{
        background: up ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
        border: `1px solid ${up ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}`,
        boxShadow: up ? '0 0 16px rgba(74,222,128,0.25)' : '0 0 16px rgba(248,113,113,0.25)',
      }}
    >
      <p className="text-lg font-bold leading-none" style={{ color, fontFamily: 'JetBrains Mono, monospace' }}>
        {pct > 0 ? '+' : ''}{pct}%
      </p>
      <p className="text-[10px] mt-1" style={{ color, opacity: 0.8 }}>
        {closed ? 'realised' : 'expected'}
      </p>
    </div>
  )
}

function ScalpCard({ call }: { call: Insight }) {
  const exit = call.exitPrice || call.targets?.[0] || 0
  const closed = call.tradeStatus === 'closed'
  const positive = call.returnsPct >= 0
  return (
    <div className="relative rounded-2xl p-3" style={plate}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-md"
              style={{ background: '#0b2438', color: '#f6e7b4', border: '1px solid rgba(232,184,74,0.5)', fontFamily: 'JetBrains Mono, monospace' }}
            >
              {INDEX_LABEL[call.index ?? ''] ?? call.stock}
            </span>
            {closed && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(74,222,128,0.16)', color: '#86efac' }}
              >
                Target Hit
              </span>
            )}
          </div>
          <h3 className="font-bold text-base leading-tight" style={{ color: '#fffaf3', fontFamily: 'DM Serif Display, serif' }}>
            Strike {fmt(call.strikePrice ?? 0)}
          </h3>
        </div>
        <ReturnChip pct={call.returnsPct} closed={closed} />
      </div>
      <LevelRail
        nodes={[
          { key: 'en', label: 'Entry', value: fmt(call.entryPriceLow), tone: 'entry', hot: !closed, dim: false },
          { key: 'ex', label: 'Exit', value: fmt(exit), tone: positive ? 'target' : 'sl', hot: closed, dim: false },
        ]}
      />
      <TradeTimes call={call} />
    </div>
  )
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
  const scalpInsights = useMemo(
    () => insights.filter(c => c.instrumentType === 'scalping'),
    [insights],
  )
  const inView = (calls: Insight[]) =>
    view === 'closed'
      ? calls.filter(c => c.tradeStatus === 'closed')
      : view === 'live'
        ? calls.filter(c => c.tradeStatus === 'open' && isTodayUTC(c.date))
        : calls.filter(c => c.tradeStatus === 'open' && !isTodayUTC(c.date))

  const visible = useMemo(() => inView(byInstrument), [byInstrument, view])
  const scalpVisible = useMemo(() => inView(scalpInsights), [scalpInsights, view])
  const emptyMessage = view === 'live'
    ? "No live trades published today — check back soon."
    : view === 'past'
      ? "No past open trades right now."
      : "No closed trades yet."

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <style>{`@keyframes trade-glow { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.35); } }`}</style>
      <div aria-hidden className="pointer-events-none absolute -left-8 top-0 h-40 w-56 rounded-full blur-3xl" style={{ background: 'rgba(232,184,74,0.28)' }} />
      <div aria-hidden className="pointer-events-none absolute right-0 top-6 h-36 w-64 rounded-full blur-3xl" style={{ background: 'rgba(15,118,110,0.22)' }} />
      {!loading && !error && (
        <FortnightBanner insights={insights} />
      )}
      <div className="relative mb-8">
        <h1
          className="text-3xl font-bold mb-1.5"
          style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--navy)' }}
        >
          {pageTitle[view]}
        </h1>
        <p className="text-sm" style={{ color: 'var(--muted-text)' }}>
          Stop on the left. Entry in gold. Targets climb to the right.
        </p>
      </div>

      {/* Equity / F&O filter — scalping is its own section below this list */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(11,36,56,0.06)', border: '1px solid rgba(232,184,74,0.45)' }} role="radiogroup" aria-label="Instrument type">
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
                background: instrument === i.key ? '#0b2438' : 'transparent',
                color: instrument === i.key ? '#f6e7b4' : 'var(--muted-text)',
                boxShadow: instrument === i.key ? '0 0 16px rgba(232,184,74,0.35)' : undefined,
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

      {!loading && !error && visible.length > 0 && (
        <div className="space-y-3">
          {visible.map(call => {
            const isBuy = call.action === 'BUY'
            const isFno = call.instrumentType === 'fno'
            const open = view !== 'closed'
            const isTargetHit = call.outcome === 'target_hit'
            const hitIdx = call.targetHitIndex ?? 0
            const targetLabel = (call.targets?.length ?? 0) > 1 ? `T${hitIdx + 1}` : 'Target'
            return (
              <div key={call.id} className="relative rounded-2xl p-3" style={plate}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-md"
                        style={{
                          background: isBuy ? '#16a34a' : '#dc2626',
                          color: '#ffffff',
                          fontFamily: 'JetBrains Mono, monospace',
                          boxShadow: isBuy ? '0 0 14px rgba(74,222,128,0.55)' : '0 0 14px rgba(248,113,113,0.55)',
                        }}
                      >
                        {call.action}
                      </span>
                      {!open && (
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                          style={{
                            background: isTargetHit ? 'rgba(74,222,128,0.16)' : 'rgba(248,113,113,0.16)',
                            color: isTargetHit ? '#86efac' : '#fca5a5',
                          }}
                        >
                          {isTargetHit ? `${targetLabel} hit` : 'SL hit'}
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: '#c5d4e4' }}>
                        {call.timeframe || (isFno ? 'Intraday' : '')}
                      </span>
                    </div>
                    <h3 className="font-bold text-base leading-tight truncate" style={{ color: '#fffaf3', fontFamily: 'DM Serif Display, serif' }}>
                      {call.stock}
                    </h3>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: '#c5d4e4' }}>
                      {call.symbol}
                    </p>
                  </div>
                  <ReturnChip pct={call.returnsPct} closed={!open} />
                </div>
                <LevelRail nodes={tradeNodes(call, open)} />
                <TradeTimes call={call} />
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && (
        <section className="mt-10">
          <h2
            className="text-xl font-bold mb-1"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--navy)' }}
          >
            Scalping Trade
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-text)' }}>
            Index scalps, published separately from Equity and F&amp;O.
          </p>
          {scalpVisible.length === 0 ? (
            <p className="text-sm py-4" style={{ color: 'var(--muted-text)' }}>
              {view === 'live'
                ? 'No live scalping trades published today.'
                : view === 'past'
                  ? 'No past open scalping trades.'
                  : 'No closed scalping trades yet.'}
            </p>
          ) : (
            <div className="space-y-3">
              {scalpVisible.map(call => (
                <ScalpCard key={call.id} call={call} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
