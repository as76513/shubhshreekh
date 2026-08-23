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
    <div
      className="min-h-screen"
      style={{ background: 'var(--background)' }}
    >
      {/* Market Ticker */}
      <div
        className="overflow-hidden py-2.5"
        style={{
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          className="ticker-track flex items-center gap-8 whitespace-nowrap"
          style={{ width: 'max-content' }}
        >
          {[...marketTicker, ...marketTicker].map((t, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0 px-1">
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--muted-foreground)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {t.name}
              </span>
              <span
                className="text-xs font-bold"
                style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {t.value}
              </span>
              <span
                className="text-xs font-medium"
                style={{ color: t.up ? 'var(--accent)' : '#f87171' }}
              >
                {t.pct}
              </span>
              <span className="mx-2 text-xs opacity-20" style={{ color: 'var(--border)' }}>|</span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
              Good morning, {user.name} 👋
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Thursday, 21 August 2026 · NSE Open
            </p>
          </div>
          {!isPro && (
            <button
              onClick={onUpgrade}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))',
                color: 'var(--primary-foreground)',
              }}
            >
              ✦ Upgrade to Pro
            </button>
          )}
        </div>

        {/* Free plan banner */}
        {!isPro && (
          <div
            className="rounded-2xl p-5 mb-8 flex items-center justify-between gap-4"
            style={{
              background: 'linear-gradient(135deg, var(--primary-08) 0%, var(--primary-03) 100%)',
              border: '1px solid var(--primary-20)',
            }}
          >
            <div>
              <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--primary)' }}>
                You are on the Free Plan
              </p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Upgrade to Pro for the F&O desk, unlimited market insights, MF alerts, all courses, and priority support.
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{
                background: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              See Pro Plans →
            </button>
          </div>
        )}

        {/* Index tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'NIFTY 50', value: '24,312', change: '+0.67%', up: true },
            { label: 'SENSEX', value: '79,845', change: '+0.71%', up: true },
            { label: 'BANK NIFTY', value: '52,189', change: '-0.23%', up: false },
            { label: 'Active Calls', value: isPro ? '8' : '3', change: 'this week', up: true },
            { label: 'MF Alerts', value: isPro ? '7' : '2', change: 'this week', up: true },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-4"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs mb-1.5" style={{ color: 'var(--muted-foreground)' }}>
                {s.label}
              </p>
              <p
                className="text-2xl font-bold mb-0.5"
                style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {s.value}
              </p>
              <span
                className="text-xs font-medium"
                style={{ color: s.up ? 'var(--accent)' : '#f87171' }}
              >
                {s.change}
              </span>
            </div>
          ))}
        </div>

        {/* F&O Desk */}
        <div
          className="relative rounded-2xl p-5 mb-8 overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-start justify-between mb-4 gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                  F&O Desk
                </h2>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    background: 'var(--primary-12)',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary-25)',
                  }}
                >
                  Pro
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                Futures & options calls on Nifty, Bank Nifty, and stock derivatives
              </p>
            </div>
          </div>

          <div className={!isPro ? 'blur-[3px] pointer-events-none select-none' : ''}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {foCalls.map(call => (
                <div
                  key={call.id}
                  className="rounded-xl p-3.5"
                  style={{
                    background: 'var(--secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{
                        background: call.action === 'BUY' ? 'rgba(14,203,129,0.12)' : 'rgba(248,113,113,0.12)',
                        color: call.action === 'BUY' ? 'var(--accent)' : '#f87171',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {call.action} {call.type}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                      {call.segment}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mb-1.5 leading-snug" style={{ color: 'var(--foreground)' }}>
                    {call.instrument}
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'var(--muted-foreground)' }}>
                    {call.underlying} · Exp {call.expiry}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--muted-foreground)' }}>
                      {call.segment === 'Futures' ? 'CMP' : 'Prem'}{' '}
                      <span style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}>
                        ₹{call.premium.toLocaleString('en-IN')}
                      </span>
                    </span>
                    <span
                      className="font-bold"
                      style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      +{call.returnsPct}%
                    </span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
                    Tgt ₹{call.target.toLocaleString('en-IN')} · SL ₹{call.stopLoss.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {!isPro && (
            <div
              className="absolute inset-0 flex items-center justify-center p-6"
              style={{
                background: 'linear-gradient(180deg, var(--overlay-55) 0%, var(--overlay-80) 100%)',
                backdropFilter: 'blur(2px)',
              }}
            >
              <div className="text-center max-w-sm">
                <div
                  className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-lg"
                  style={{
                    background: 'var(--primary-12)',
                    border: '1px solid var(--primary-30)',
                    color: 'var(--primary)',
                  }}
                >
                  🔒
                </div>
                <p className="font-bold text-base mb-1" style={{ color: 'var(--foreground)' }}>
                  F&O Desk is locked
                </p>
                <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--muted-foreground)' }}>
                  Futures and options calls are available only on Pro. Unlock Nifty, Bank Nifty, and stock F&O ideas.
                </p>
                <button
                  onClick={onUpgrade}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))',
                    color: 'var(--primary-foreground)',
                  }}
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Calls */}
          <div
            className="lg:col-span-2 rounded-2xl p-5"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                Recent Market Insights
              </h2>
              <button
                onClick={() => navigate('trading')}
                className="text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--primary)' }}
              >
                View all →
              </button>
            </div>

            <div className="space-y-3">
              {recentCalls.map(call => (
                <div
                  key={call.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: 'var(--secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: call.action === 'BUY' ? 'rgba(14,203,129,0.12)' : 'rgba(248,113,113,0.12)',
                      color: call.action === 'BUY' ? 'var(--accent)' : '#f87171',
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
                      CMP ₹{call.cmp.toLocaleString('en-IN')} · Target ₹{call.target.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className="text-sm font-bold"
                      style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
                    >
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
                className="mt-3 rounded-xl p-3 flex items-center justify-between"
                style={{
                  background: 'var(--primary-05)',
                  border: '1px dashed var(--primary-25)',
                }}
              >
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  🔒 {tradingCalls.filter(c => c.isPro).length} more Pro calls available
                </p>
                <button
                  onClick={onUpgrade}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Unlock all
                </button>
              </div>
            )}
          </div>

          {/* MF Alerts */}
          <div
            className="rounded-2xl p-5"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
                MF Alerts
              </h2>
              <button
                onClick={() => navigate('mf-alerts')}
                className="text-xs font-medium hover:opacity-70 transition-opacity"
                style={{ color: 'var(--primary)' }}
              >
                View all →
              </button>
            </div>

            <div className="space-y-3">
              {recentAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="p-3 rounded-xl"
                  style={{
                    background: 'var(--secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background: alert.action === 'INVEST' ? 'rgba(14,203,129,0.12)' :
                          alert.action === 'SIP' ? 'rgba(99,102,241,0.12)' : 'var(--primary-12)',
                        color: alert.action === 'INVEST' ? 'var(--accent)' :
                          alert.action === 'SIP' ? '#818cf8' : 'var(--primary)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {alert.action}
                    </span>
                    <span className="text-xs font-bold" style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {alert.returns1Y > 0 ? '+' : ''}{alert.returns1Y}% 1Y
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                    {alert.fund.split(' – ')[0]}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {alert.category} · Min SIP ₹{alert.minSIP}
                  </p>
                </div>
              ))}
            </div>

            {!isPro && (
              <div
                className="mt-3 rounded-xl p-3 flex items-center justify-between"
                style={{
                  background: 'var(--primary-05)',
                  border: '1px dashed var(--primary-25)',
                }}
              >
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  🔒 {mfAlerts.filter(a => a.isPro).length} Pro alerts locked
                </p>
                <button
                  onClick={onUpgrade}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Unlock
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Featured Courses */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base" style={{ color: 'var(--foreground)' }}>
              Continue Learning
            </h2>
            <button
              onClick={() => navigate('courses')}
              className="text-xs font-medium hover:opacity-70 transition-opacity"
              style={{ color: 'var(--primary)' }}
            >
              All courses →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredCourses.map(course => (
              <div
                key={course.id}
                className="rounded-xl overflow-hidden cursor-pointer group transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                onClick={() => navigate('course-detail', course.id)}
              >
                <div className="relative h-36 bg-secondary overflow-hidden">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, var(--overlay-50) 0%, transparent 60%)' }}
                  />
                  {course.isPro && !isPro && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'var(--overlay-60)', backdropFilter: 'blur(2px)' }}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-1">🔒</div>
                        <p className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
                          Pro Only
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold line-clamp-2 mb-1" style={{ color: 'var(--foreground)' }}>
                    {course.title}
                  </p>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    <span>{course.lessons} lessons</span>
                    <span>⭐ {course.rating}</span>
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
