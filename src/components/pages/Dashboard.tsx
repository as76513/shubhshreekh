"use client";

import { todaysUpdate, tradingCalls, courses, foCalls } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

export default function Dashboard() {
  const { user, navigate, onUpgrade } = useAuth();
  if (!user) return null;
  const isPro = user.subscription === 'pro'
  const recentCalls = tradingCalls.filter(c => !c.isPro || isPro).slice(0, 4)
  const featuredCourses = courses.slice(0, 3)

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
          {isPro && (
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
        <a
          href={todaysUpdate.pdfUrl}
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
              {todaysUpdate.title}
            </p>
            <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
              {todaysUpdate.summary}
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

        {!isPro && (
          <div
            className="rounded-2xl px-5 py-4 mb-8 flex items-center justify-between gap-4"
            style={{ background: 'var(--card-bg)' }}
          >
            <div className="min-w-0">
              <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--navy)' }}>
                You&apos;re on Free
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted-text)' }}>
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

        {/* Metric tiles — compact, navy + gold border combination */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 mb-8 rounded-xl overflow-hidden"
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
            { label: 'Active Calls', value: isPro ? '8' : '3', change: 'this week', up: true },
          ].map((s, i) => (
            <div
              key={s.label}
              className={[
                'p-2.5',
                i % 2 === 1 ? 'border-l' : '',
                i >= 2 ? 'border-t md:border-t-0' : '',
                i >= 1 ? 'md:border-l' : '',
              ].join(' ')}
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
              {s.change.includes('%') ? (
                <span
                  className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: s.up ? 'var(--gain-bg)' : 'var(--loss-bg)',
                    color: s.up ? 'var(--gain)' : 'var(--loss)',
                  }}
                >
                  {s.up ? '▲ ' : '▼ '}{s.change}
                </span>
              ) : (
                <span className="text-[10px]" style={{ color: 'var(--muted-text)', fontWeight: 500 }}>
                  {s.change}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* F&O Desk */}
        <div className="relative rounded-2xl p-5 mb-6 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-semibold text-base" style={{ color: 'var(--navy)' }}>
              F&O Desk
            </h2>
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--navy-gold-soft) 16%, transparent)',
                color: 'var(--navy-gold-text)',
                border: '1px solid color-mix(in srgb, var(--navy-gold-soft) 35%, transparent)',
              }}
            >
              Pro
            </span>
          </div>
          <p className="text-xs mb-4" style={{ color: 'var(--muted-text)' }}>
            Futures & options ideas on Nifty, Bank Nifty, and stock derivatives
          </p>

          <div className={!isPro ? 'blur-[2px] pointer-events-none select-none opacity-60' : ''}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {foCalls.map(call => (
                <div
                  key={call.id}
                  className="rounded-xl p-3.5"
                  style={{ background: 'rgba(11,42,85,0.06)', border: '1px solid rgba(29,78,216,0.2)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{
                        background: call.action === 'BUY' ? 'var(--buy-badge)' : 'var(--sell-badge)',
                        color: '#ffffff',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {call.action} {call.type}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted-text)' }}>
                      {call.segment}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mb-1 leading-snug" style={{ color: 'var(--navy)' }}>
                    {call.instrument}
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'var(--muted-text)' }}>
                    {call.underlying} · Exp {call.expiry}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--muted-text)' }}>
                      Prem{' '}
                      <span style={{ color: 'var(--navy)', fontFamily: 'JetBrains Mono, monospace' }}>
                        ₹{call.premium.toLocaleString('en-IN')}
                      </span>
                    </span>
                    <span className="font-bold" style={{ color: 'var(--gain)', fontFamily: 'JetBrains Mono, monospace' }}>
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
                background: 'color-mix(in srgb, var(--screen-bg) 65%, transparent)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              <div className="text-center max-w-xs">
                <p className="font-semibold text-base mb-1" style={{ color: 'var(--navy)' }}>
                  Available on Pro
                </p>
                <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--muted-text)' }}>
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

        <div className="grid grid-cols-1 gap-5">
          <div className="rounded-2xl p-5" style={{ background: 'var(--card-bg)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base" style={{ color: 'var(--navy)' }}>
                Recent insights
              </h2>
              <button
                onClick={() => navigate('trading')}
                className="text-xs font-medium hover:opacity-70"
                style={{ color: 'var(--blue-accent)' }}
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {recentCalls.map(call => {
                const isBuy = call.action === 'BUY'
                const range = Math.abs(call.target - call.stopLoss) || 1
                const progress = Math.min(
                  100,
                  Math.max(0, ((call.cmp - Math.min(call.stopLoss, call.target)) / range) * 100),
                )
                return (
                <div
                  key={call.id}
                  className="p-3 rounded-xl"
                  style={{ background: 'rgba(11,42,85,0.06)' }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: isBuy ? 'var(--buy-badge)' : 'var(--sell-badge)',
                        color: '#ffffff',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {call.action}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--navy)' }}>
                        {call.stock}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
                        {call.timeframe}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--gain)', fontFamily: 'JetBrains Mono, monospace' }}>
                        +{call.returnsPct}%
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-1.5 text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    <span style={{ color: 'var(--loss)' }}>SL ₹{call.stopLoss.toLocaleString('en-IN')}</span>
                    <span style={{ color: 'var(--navy)', fontWeight: 700 }}>₹{call.cmp.toLocaleString('en-IN')}</span>
                    <span style={{ color: 'var(--gain)' }}>Tgt ₹{call.target.toLocaleString('en-IN')}</span>
                  </div>
                  <div
                    className="relative h-1.5 rounded-full overflow-hidden"
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
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                      style={{
                        left: `calc(${progress}% - 5px)`,
                        background: 'var(--navy)',
                        border: '2px solid #fff',
                        boxShadow: '0 0 0 1.5px rgba(11,42,85,0.28)',
                      }}
                      title="CMP"
                    />
                  </div>
                </div>
                )
              })}
            </div>

            {!isPro && (
              <div
                className="mt-3 rounded-xl p-3 flex items-center justify-between gap-3"
                style={{
                  background: 'color-mix(in srgb, var(--navy-gold-soft) 10%, var(--card-bg))',
                  border: '1px dashed color-mix(in srgb, var(--navy-gold-soft) 45%, transparent)',
                }}
              >
                <p className="text-xs" style={{ color: 'var(--muted-text)' }}>
                  🔒 {tradingCalls.filter(c => c.isPro).length} more Pro insights locked
                </p>
                <button
                  onClick={onUpgrade}
                  className="text-xs font-semibold whitespace-nowrap hover:underline"
                  style={{ color: 'var(--navy-gold-text)' }}
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>
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
