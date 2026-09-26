"use client";

import { videos, testimonials } from "@/lib/data";
import ServiceSlider from "@/components/ServiceSlider";
import CourseSlider from "@/components/CourseSlider";
import PlanSlider from "@/components/PlanSlider";
import { useAuth } from "@/lib/auth-context";

const stats = [
  { value: '50,000+', label: 'Learners' },
  { value: '2,400+', label: 'Ideas shared' },
  { value: '45+', label: 'Courses' },
  { value: '4.8★', label: 'Avg rating' },
]

export default function Landing() {
  const { navigate } = useAuth();

  return (
    <div>
      {/* Hero — one composition: brand, line, support, CTA */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 70% -10%, var(--primary-08) 0%, transparent 68%)',
          }}
        />

        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 pt-24 pb-20 text-center">
          <p
            className="motion-settle text-sm font-semibold tracking-[0.14em] uppercase mb-5"
            style={{ color: 'var(--primary)' }}
          >
            ShubhShree Knowledge Hub
          </p>

          <h1
            className="motion-settle fade-up-delay-1 text-5xl sm:text-6xl lg:text-[4.25rem] font-bold mb-5 leading-[1.08]"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            Invest today.<br />
            <span className="italic hl-grad">Grow tomorrow.</span>
          </h1>

          <p
            className="motion-settle fade-up-delay-2 text-lg max-w-xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Research notes, mutual fund explainers, and market education — built for Indian investors.
          </p>

          <div className="motion-settle fade-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('login')}
              className="btn-action px-8 py-3.5 rounded-xl font-semibold text-sm"
            >
              Start free
            </button>
            <button
              onClick={() => {
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="pressable px-5 py-3 rounded-xl text-sm font-semibold"
              style={{
                color: 'var(--foreground)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              See plans
            </button>
          </div>
        </div>
      </section>

      {/* Achievement strip — same pattern as dashboard metric tiles */}
      <section className="py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map(s => (
            <div
              key={s.label}
              className="surface-card motion-lift rounded-2xl px-4 py-5 text-center"
              style={{
                borderTop: '3px solid var(--primary)',
              }}
            >
              <p
                className="text-2xl font-bold mb-1"
                style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {s.value}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-8 text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            Insights. Funds. Courses.
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Everything you need to learn markets — in one place.
          </p>
        </div>
        <ServiceSlider />
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 scroll-mt-24">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2
              className="text-3xl sm:text-4xl font-bold mb-3"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
            >
              Simple pricing
            </h2>
            <p className="text-base" style={{ color: 'var(--muted-foreground)' }}>
              Start free. Upgrade when you are ready.
            </p>
          </div>
          <PlanSlider />
        </div>
      </section>

      {/* Courses */}
      <section className="py-20" style={{ background: 'var(--surface-secondary)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-end justify-between mb-10">
          <div>
            <h2
              className="text-3xl sm:text-4xl font-bold"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
            >
              Popular courses
            </h2>
          </div>
          <button
            onClick={() => navigate('courses')}
            className="hidden sm:flex text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--primary)' }}
          >
            View all →
          </button>
        </div>
        <CourseSlider />
      </section>

      {/* Videos */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <h2
              className="text-3xl sm:text-4xl font-bold"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
            >
              Latest tutorials
            </h2>
            <button
              onClick={() => navigate('videos')}
              className="hidden sm:flex text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--primary)' }}
            >
              See all →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {videos.slice(0, 4).map(v => (
              <div
                key={v.id}
                className="surface-card motion-lift rounded-2xl overflow-hidden cursor-pointer group"
                onClick={() => navigate('videos')}
              >
                <div className="relative h-32 overflow-hidden" style={{ background: 'var(--secondary)' }}>
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded-md font-mono"
                    style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                  >
                    {v.duration}
                  </div>
                </div>
                <div className="p-3.5">
                  <h4 className="text-xs font-semibold line-clamp-2 mb-1.5" style={{ color: 'var(--foreground)' }}>
                    {v.title}
                  </h4>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {v.views} views
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Investor stories */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2
            className="text-3xl sm:text-4xl font-bold"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            What investors say
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {testimonials.map(t => (
            <div
              key={t.name}
              className="surface-card motion-lift rounded-2xl p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: 'color-mix(in srgb, var(--gold) 16%, transparent)',
                    color: 'var(--gold)',
                    fontFamily: 'JetBrains Mono, monospace',
                    border: '1px solid color-mix(in srgb, var(--gold) 35%, transparent)',
                  }}
                >
                  {t.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    {t.city}
                  </p>
                </div>
                <span
                  className="text-sm font-bold flex-shrink-0"
                  style={{ color: 'var(--gold)', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {t.returns}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--secondary-foreground)' }}>
                “{t.text}”
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA — single brand moment */}
      <section
        className="py-20 relative overflow-hidden card-surface"
        style={{
          background: 'linear-gradient(145deg, #0b2438 0%, #071a2a 100%)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 50% 70% at 85% 40%, var(--primary-10) 0%, transparent 65%)',
          }}
        />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: 'DM Serif Display, serif', color: '#ffffff' }}
          >
            Ready when you are
          </h2>
          <p className="text-base mb-8" style={{ color: '#a8b8cc' }}>
            Join learners building market knowledge with ShubhShree. Free to start.
          </p>
          <button
            onClick={() => navigate('login')}
            className="btn-action px-10 py-4 rounded-xl font-semibold text-base"
          >
            Create free account
          </button>
        </div>
      </section>
    </div>
  )
}
