"use client";

import { marketTicker, tradingCalls, mfAlerts, courses, foCalls } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

export default function Dashboard() {
  const { user, navigate, onUpgrade } = useAuth();
  if (!user) return null;
  const isPro = user.subscription === 'pro'
  const recentCalls = tradingCalls.filter(c => !c.isPro || isPro).slice(0, 4)
  const recentAlerts = mfAlerts.filter(a => !a.isPro || isPro).slice(0, 3)
  const featuredCourses = courses.slice(0, 3)

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      {/* Compact market strip */}
      <div
        className="overflow-hidden py-2"
        style={{
          background: 'var(--card)',
          borderBottom: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
        }}
      >
        <div className="ticker-track flex items-center gap-8 whitespace-nowrap" style={{ width: 'max-content' }}>
          {[...marketTicker, ...marketTicker].map((t, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0 px-1">
              <span className="text-xs font-semibold" style={{ color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace' }}>
                {t.name}
              </span>
              <span className="text-xs font-bold" style={{ color: '#ffffff', fontFamily: 'JetBrains Mono, monospace' }}>
                {t.value}
              </span>
              <span className="text-xs font-medium" style={{ color: t.up ? '#34d399' : '#fca5a5' }}>
                {t.up ? '▲ ' : '▼ '}{t.pct}
              </span>
              <span className="mx-2 text-xs" style={{ color: 'rgba(226,232,240,0.4)' }}>|</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1
            className="text-2xl sm:text-3xl font-bold mb-1 tracking-tight"
            style={{ color: 'var(--foreground)', fontFamily: 'DM Serif Display, serif' }}
          >
            Hello {user.name}! 👋
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Thursday, 21 August 2026 · NSE Open
          </p>
        </div>

        {!isPro && (
          <div
            className="surface-card rounded-2xl px-5 py-4 mb-8 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--foreground)' }}>
                You&apos;re on Free
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                Unlock F&O desk, full insights, and all courses with Pro.
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="btn-pro motion-breath flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold"
            >
              Upgrade
            </button>
          </div>
        )}

        {/* Metric tiles — one surface family; color only on ±% deltas */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'NIFTY 50', value: '24,312', change: '+0.67%', up: true },
            { label: 'SENSEX', value: '79,845', change: '+0.71%', up: true },
            { label: 'BANK NIFTY', value: '52,189', change: '-0.23%', up: false },
            { label: 'Active Calls', value: isPro ? '8' : '3', change: 'this week', up: true },
            { label: 'MF Alerts', value: isPro ? '7' : '2', change: 'this week', up: true },
          ].map(s => (
            <div
              key={s.label}
              className="surface-card motion-lift rounded-2xl p-4"
              style={{
                borderTop: '3px solid var(--primary)',
              }}
            >
              <p className="text-[11px] font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                {s.label}
              </p>
              <p
                className="text-xl font-bold mb-0.5"
                style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {s.value}
              </p>
              <span
                className={`text-xs ${s.change.includes('%') ? (s.up ? 'delta-up' : 'delta-down') : ''}`}
                style={!s.change.includes('%') ? { color: 'var(--muted-foreground)', fontWeight: 500 } : undefined}
              >
                {s.change}
              </span>
            </div>
          ))}
        </div>

        {/* F&O Desk */}
        <div className="surface-card relative rounded-2xl p-5 mb-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-base" style={{ color: 'var(--foreground)' }}>
              F&O Desk
            </h2>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--gold) 16%, transparent)',
                color: 'var(--gold)',
                border: '1px solid color-mix(in srgb, var(--gold) 35%, transparent)',
              }}
            >
              Pro
            </span>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Futures & options ideas on Nifty, Bank Nifty, and stock derivatives
          </p>

          <div className={!isPro ? 'blur-[2px] pointer-events-none select-none opacity-60' : ''}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {foCalls.map(call => (
                <div
                  key={call.id}
                  className="rounded-xl p-3.5"
                  style={{ background: 'var(--surface-inset)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{
                        background: call.action === 'BUY' ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'color-mix(in srgb, var(--destructive) 12%, transparent)',
                        color: call.action === 'BUY' ? 'var(--accent)' : 'var(--destructive)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {call.action} {call.type}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                      {call.segment}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mb-1 leading-snug" style={{ color: 'var(--foreground)' }}>
                    {call.instrument}
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
                    {call.underlying} · Exp {call.expiry}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      Prem{' '}
                      <span style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}>
                        ₹{call.premium.toLocaleString('en-IN')}
                      </span>
                    </span>
                    <span className="font-bold" style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      +{call.returnsPct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!isPro && (
            <div
              className="absolute inset-0 flex items-center justify-center p-6"
              style={{
                background: 'color-mix(in srgb, var(--surface) 55%, transparent)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              <div className="text-center max-w-xs">
                <p className="font-semibold text-base mb-1" style={{ color: 'var(--foreground)' }}>
                  Available on Pro
                </p>
                <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                  Unlock futures and options research for Nifty and Bank Nifty.
                </p>
                <button
                  onClick={onUpgrade}
                  className="btn-pro px-5 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="surface-card lg:col-span-2 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base" style={{ color: 'var(--foreground)' }}>
                Recent insights
              </h2>
              <button
                onClick={() => navigate('trading')}
                className="text-xs font-medium hover:opacity-70"
                style={{ color: 'var(--primary)' }}
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {recentCalls.map(call => (
                <div
                  key={call.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--surface-inset)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                    style={{
                      background: call.action === 'BUY' ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : 'color-mix(in srgb, var(--destructive) 12%, transparent)',
                      color: call.action === 'BUY' ? 'var(--accent)' : 'var(--destructive)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {call.action}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>
                      {call.stock}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      CMP ₹{call.cmp.toLocaleString('en-IN')} · Tgt ₹{call.target.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      +{call.returnsPct}%
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {call.timeframe}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {!isPro && (
              <div
                className="mt-3 rounded-xl p-3 flex items-center justify-between gap-3"
                style={{
                  background: 'color-mix(in srgb, var(--gold) 10%, var(--surface-secondary))',
                  border: '1px dashed color-mix(in srgb, var(--gold) 45%, transparent)',
                }}
              >
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  🔒 {tradingCalls.filter(c => c.isPro).length} more Pro insights locked
                </p>
                <button
                  onClick={onUpgrade}
                  className="text-xs font-semibold whitespace-nowrap hover:underline"
                  style={{ color: 'var(--gold)' }}
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>

          <div className="surface-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base" style={{ color: 'var(--foreground)' }}>
                MF Alerts
              </h2>
              <button
                onClick={() => navigate('mf-alerts')}
                className="text-xs font-medium hover:opacity-70"
                style={{ color: 'var(--primary)' }}
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {recentAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="p-3 rounded-xl"
                  style={{ background: 'var(--surface-inset)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{
                        background: 'color-mix(in srgb, var(--gold) 12%, transparent)',
                        color: 'var(--gold)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {alert.action}
                    </span>
                    <span className="text-xs font-bold" style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {alert.returns1Y > 0 ? '+' : ''}{alert.returns1Y}%
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                    {alert.fund.split(' – ')[0]}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {alert.category}
                  </p>
                </div>
              ))}
            </div>

            {!isPro && (
              <div
                className="mt-3 rounded-xl p-3 flex items-center justify-between gap-3"
                style={{
                  background: 'color-mix(in srgb, var(--gold) 10%, var(--surface-secondary))',
                  border: '1px dashed color-mix(in srgb, var(--gold) 45%, transparent)',
                }}
              >
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  🔒 {mfAlerts.filter(a => a.isPro).length} Pro alerts locked
                </p>
                <button
                  onClick={onUpgrade}
                  className="text-xs font-semibold whitespace-nowrap hover:underline"
                  style={{ color: 'var(--gold)' }}
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-base" style={{ color: 'var(--foreground)' }}>
              Continue learning
            </h2>
            <button
              onClick={() => navigate('courses')}
              className="text-xs font-medium hover:opacity-70"
              style={{ color: 'var(--primary)' }}
            >
              All courses
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredCourses.map(course => (
              <div
                key={course.id}
                className="surface-card rounded-2xl overflow-hidden cursor-pointer pressable"
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
                        background: 'color-mix(in srgb, var(--surface) 50%, transparent)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      <span
                        className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ background: 'var(--primary-15)', color: 'var(--primary)' }}
                      >
                        Pro
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <p className="text-sm font-semibold line-clamp-2 mb-1" style={{ color: 'var(--foreground)' }}>
                    {course.title}
                  </p>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
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
