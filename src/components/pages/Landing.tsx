"use client";

import { marketTicker, videos, testimonials } from "@/lib/data";
import ServiceSlider from "@/components/ServiceSlider";
import CourseSlider from "@/components/CourseSlider";
import PlanSlider from "@/components/PlanSlider";
import { useAuth } from "@/lib/auth-context";

const stats = [
  { value: '50,000+', label: 'Active Learners' },
  { value: '2,400+', label: 'Research Ideas Shared' },
  { value: '45+', label: 'Courses Available' },
  { value: '4.8★', label: 'Avg. Course Rating' },
]

export default function Landing() {
  const { navigate } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 70% -10%, var(--primary-10) 0%, transparent 68%)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-16 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{
              background: 'var(--primary-08)',
              border: '1px solid var(--primary-25)',
              color: 'var(--primary)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--primary)', animation: 'pulse 2s infinite' }}
            />
            Trusted by 50,000+ investors across India
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-[1.05]"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            INVEST today.<br />
            <span className="italic hl-grad">GROW tomorrow.</span>
          </h1>

          <p className="text-lg max-w-2xl mx-auto mb-8 leading-relaxed" style={{ color: 'var(--secondary-foreground)' }}>
            Let's build your <span className="hl font-semibold">financial future</span> together.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <button
              onClick={() => navigate('login')}
              className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))',
                color: 'var(--primary-foreground)',
              }}
            >
              Start Free — No Card Required
            </button>
            <button
              onClick={() => navigate('courses')}
              className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:bg-secondary"
              style={{
                color: 'var(--foreground)',
                border: '1px solid var(--border)',
              }}
            >
              Explore Courses
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map(s => (
              <div
                key={s.label}
                className="rounded-2xl p-5"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
              >
                <p
                  className="text-2xl font-bold mb-0.5"
                  style={{
                    color: 'var(--primary)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
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

        {/* Market Ticker */}
        <div
          className="overflow-hidden py-3"
          style={{
            background: 'color-mix(in srgb, var(--card) 62%, transparent)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="ticker-track flex items-center gap-8 whitespace-nowrap" style={{ width: 'max-content' }}>
            {[...marketTicker, ...marketTicker].map((t, i) => (
              <div key={i} className="flex items-center gap-2 flex-shrink-0 px-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {t.name}
                </span>
                <span className="text-xs font-bold" style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {t.value}
                </span>
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{
                    background: t.up ? 'rgba(14,203,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: t.up ? 'var(--accent)' : '#f87171',
                  }}
                >
                  {t.pct}
                </span>
                <span
                  className="mx-3 text-xs"
                  style={{ color: 'var(--border)', opacity: 0.5 }}
                >
                  ·
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services slider */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>
            What We Offer
          </p>
          <h2
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            Insights. Funds. Courses. <span className="hl">Portfolio.</span>
          </h2>
        </div>
        <ServiceSlider />
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="py-24 scroll-mt-24"
        style={{
          background: 'color-mix(in srgb, var(--card) 58%, transparent)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>
              Pricing
            </p>
            <h2
              className="text-4xl font-bold mb-4"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
            >
              Simple, transparent <span className="hl">pricing</span>
            </h2>
            <p className="text-base" style={{ color: 'var(--muted-foreground)' }}>
              Start free. Upgrade when you are ready to go all-in.
            </p>
          </div>

          <PlanSlider />
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--primary)' }}>
              Learn & Grow
            </p>
            <h2
              className="text-4xl font-bold"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
            >
              Popular <span className="hl">Courses</span>
            </h2>
          </div>
          <button
            onClick={() => navigate('courses')}
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium transition-all hover:opacity-70"
            style={{ color: 'var(--primary)' }}
          >
            View all courses →
          </button>
        </div>

        <CourseSlider />
      </section>

      {/* Videos Section */}
      <section
        className="py-24"
        style={{
          background: 'color-mix(in srgb, var(--card) 58%, transparent)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--primary)' }}>
                Video Library
              </p>
              <h2
                className="text-4xl font-bold"
                style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
              >
                Latest <span className="hl">Tutorials</span>
              </h2>
            </div>
            <button
              onClick={() => navigate('videos')}
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium transition-all hover:opacity-70"
              style={{ color: 'var(--primary)' }}
            >
              See all videos →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {videos.slice(0, 4).map(v => (
              <div
                key={v.id}
                className="rounded-xl overflow-hidden cursor-pointer group transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--secondary)', border: '1px solid var(--border)' }}
                onClick={() => navigate('videos')}
              >
                <div className="relative h-32 bg-muted overflow-hidden">
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    style={{ background: 'var(--overlay-50)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm"
                      style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
                    >
                      ▶
                    </div>
                  </div>
                  <div
                    className="absolute bottom-2 right-2 text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ background: 'var(--overlay-85)', color: 'var(--foreground)' }}
                  >
                    {v.duration}
                  </div>
                  {v.isPro && (
                    <div
                      className="absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))', color: 'var(--primary-foreground)' }}
                    >
                      PRO
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="text-xs font-semibold line-clamp-2 mb-1.5" style={{ color: 'var(--foreground)' }}>
                    {v.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    <span>{v.views} views</span>
                    <span>{v.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>
            Investor Stories
          </p>
          <h2
            className="text-4xl font-bold"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            Results that <span className="hl">speak</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {testimonials.map(t => (
            <div
              key={t.name}
              className="rounded-2xl p-6"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: `${t.color}20`, color: t.color, fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {t.initials}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {t.city}
                  </p>
                </div>
                <div
                  className="px-3 py-1.5 rounded-full text-sm font-bold"
                  style={{
                    background: 'rgba(14,203,129,0.1)',
                    color: 'var(--accent)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {t.returns}
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--secondary-foreground)' }}>
                "{t.text}"
              </p>
              <div className="flex items-center gap-0.5 mt-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} style={{ color: 'var(--primary)', fontSize: '12px' }}>★</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section
        className="py-20 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, #1a3a68 70%, transparent), color-mix(in srgb, #0c1a40 78%, transparent))',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 80% at 80% 50%, var(--primary-08) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2
            className="text-4xl sm:text-5xl font-bold mb-4"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            Ready to invest like a <span className="hl">pro</span>?
          </h2>
          <p className="text-base mb-8" style={{ color: 'var(--secondary-foreground)' }}>
            Join 50,000+ learners who use Shubhshree to build market knowledge. Start for free today.
          </p>
          <button
            onClick={() => navigate('login')}
            className="px-10 py-4 rounded-xl font-bold text-base transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))',
              color: 'var(--primary-foreground)',
            }}
          >
            Create Free Account →
          </button>
        </div>
      </section>
    </div>
  )
}
