"use client";

import { useEffect, useState } from "react";
import { todaysUpdate, videos } from "@/lib/data";
import ServiceSlider from "@/components/ServiceSlider";
import CourseSlider from "@/components/CourseSlider";
import PlanSlider from "@/components/PlanSlider";
import Blogs from "@/components/pages/Blogs";
import { useAuth } from "@/lib/auth-context";
import { paymentsEnabled } from "@/lib/payments";
import { getSiteStats, getTestimonials, listOverviews, type Overview, type SiteStats, type Testimonial } from "@/lib/api";

const defaultStats: SiteStats = {
  learners: '50,000+',
  ideasShared: '2,400+',
  courses: '45+',
  avgRating: '4.8★',
}

const defaultTestimonials: Testimonial[] = [
  { name: "Arjun Patel", city: "Mumbai", text: "The market insights are clearly explained. The course structure helped me study setups with more confidence.", returns: "+70%", initials: "AP" },
  { name: "Meera Krishnan", city: "Chennai", text: "The research notes have completely transformed my portfolio. I now know exactly when to invest and when to wait. Absolutely worth every rupee.", returns: "+32%", initials: "MK" },
  { name: "Rohit Agarwal", city: "Delhi", text: "Priya's Technical Analysis Masterclass is better than any paid course I've taken elsewhere. The content quality is exceptional.", returns: "+48%", initials: "RA" },
  { name: "Nisha Verma", city: "Bangalore", text: "Started as a complete beginner. Within 3 months of using Shubhshree, I can read Indian market charts with much more clarity.", returns: "+25%", initials: "NV" },
]

function noteExcerpt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 280) return trimmed;
  const cut = trimmed.slice(0, 280);
  const stop = cut.lastIndexOf(" ");
  return `${(stop > 160 ? cut.slice(0, stop) : cut).trim()}…`;
}

export default function Landing() {
  const { navigate } = useAuth();
  const [siteStats, setSiteStats] = useState<SiteStats>(defaultStats);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials);
  const [latestNote, setLatestNote] = useState<Overview | null>(null);

  useEffect(() => {
    getSiteStats().then(setSiteStats).catch(() => {});
    getTestimonials().then(setTestimonials).catch(() => {});
    listOverviews()
      .then((rows) => setLatestNote(rows[0] ?? null))
      .catch(() => {});
  }, []);

  const published = latestNote ? new Date(latestNote.publishedAt) : null;
  const noteDate =
    published && !Number.isNaN(published.getTime())
      ? published.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : "From the research desk";
  const noteBody = noteExcerpt(latestNote?.text || todaysUpdate.summary);

  const stats = [
    { value: siteStats.learners, label: 'People on the desk' },
    { value: siteStats.ideasShared, label: 'Notes published' },
    { value: siteStats.courses, label: 'Courses to study' },
    { value: siteStats.avgRating, label: 'Average course rating' },
  ]

  return (
    <div>
      {/* Full-bleed offer. The note is the product shot, not a card in empty space. */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 55% 80% at 100% 0%, rgba(15,118,110,0.45) 0%, transparent 55%), linear-gradient(160deg, #071a2a 0%, #0b2438 48%, #12352f 100%)",
        }}
      >
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-10 lg:gap-16 items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase mb-4" style={{ color: "#5eead4" }}>
              For people who trade Indian markets
            </p>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] mb-5"
              style={{ fontFamily: "DM Serif Display, serif", color: "#ffffff" }}
            >
              Read the desk before you place the trade.
            </h1>
            <p className="text-lg max-w-xl mb-8 leading-relaxed" style={{ color: "#d5e2ee" }}>
              One note each session, from a SEBI-registered research analyst. What moved, what to watch next, and the equity and F&amp;O levels — with the reason written out.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => navigate("login")}
                className="btn-action px-8 py-3.5 rounded-xl font-semibold text-sm"
              >
                {paymentsEnabled ? "Start free trial" : "Get today's note"}
              </button>
              <button
                onClick={() => document.getElementById("blogs")?.scrollIntoView({ behavior: "smooth" })}
                className="px-5 py-3.5 rounded-xl text-sm font-semibold"
                style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.28)" }}
              >
                See the latest note
              </button>
            </div>
            <p className="text-xs mt-4" style={{ color: "#93a4b8" }}>
              Sign in with your mobile number. Research, not an order to buy or sell.
            </p>
          </div>

          <article
            className="min-w-0 rounded-3xl p-6 sm:p-8"
            style={{
              background: "linear-gradient(180deg, #fffaf3 0%, #fff4df 100%)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
            }}
          >
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase mb-4" style={{ color: "#0f766e" }}>
              What you open each morning
            </p>
            <ol className="space-y-3 mb-6">
              {[
                ["01", "The session", "What actually moved, in plain language."],
                ["02", "What to watch", "The next level that matters today."],
                ["03", "The levels", "Entry, stop, target, and why."],
              ].map(([n, title, line]) => (
                <li key={n} className="flex gap-3 min-w-0">
                  <span className="text-xs font-bold pt-0.5" style={{ color: "#b45309", fontFamily: "JetBrains Mono, monospace" }}>
                    {n}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold" style={{ color: "#0b2438" }}>{title}</span>
                    <span className="block text-sm" style={{ color: "#57534e" }}>{line}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="pt-5" style={{ borderTop: "1px solid rgba(120,80,20,0.18)" }}>
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase mb-2" style={{ color: "#0f766e" }}>
                From today&apos;s desk · {noteDate}
              </p>
              <p className="text-base leading-relaxed break-words" style={{ color: "#0b2438" }}>
                {noteBody}
              </p>
            </div>
          </article>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 grid grid-cols-2 lg:grid-cols-4 gap-y-4">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold" style={{ color: "#ffffff", fontFamily: "JetBrains Mono, monospace" }}>
                  {s.value}
                </p>
                <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "#b7c6d6" }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-8 py-16 grid md:grid-cols-3 gap-10">
        {[
          ["Not a tip group", "A call shows the entry, the stop, the target, and the written reason. There is no button that places the order."],
          ["SEBI-registered research", "The notes come from a research analyst. They explain a view. They do not promise a return."],
          ["New to the chart", "A course and a short video sit with the note, so you can study the setup instead of only following it."],
        ].map(([title, body]) => (
          <div key={title}>
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "DM Serif Display, serif", color: "var(--foreground)" }}>
              {title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              {body}
            </p>
          </div>
        ))}
      </section>

      <Blogs />

      {/* Services */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-8">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: "var(--primary)" }}>
            If you already follow the market
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            Equity, F&amp;O, and the lesson behind them
          </h2>
          <p className="text-sm max-w-xl" style={{ color: 'var(--muted-foreground)' }}>
            Pick the desk you came for. The note tells you the level. The course tells you how to read it.
          </p>
        </div>
        <ServiceSlider />
      </section>

      {/* Pricing — hidden until paymentsEnabled (January 2027). */}
      {paymentsEnabled && (
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
              Try Pro free for 7 days. No card required to start.
            </p>
          </div>
          <PlanSlider />
        </div>
      </section>
      )}

      {/* Courses */}
      <section className="py-20" style={{ background: 'var(--surface-secondary)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: 'var(--primary)' }}>
              If the chart is still new
            </p>
            <h2
              className="text-3xl sm:text-4xl font-bold"
              style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
            >
              Learn the setup, then read the note
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
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: 'var(--primary)' }}>
                Ten minutes
              </p>
              <h2
                className="text-3xl sm:text-4xl font-bold"
                style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
              >
                One idea you can use today
              </h2>
            </div>
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
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase mb-2" style={{ color: 'var(--primary)' }}>
            From learners
          </p>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-2"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            What changed in how they read the market
          </h2>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Comments on the notes and the courses. Not a record of returns.
          </p>
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
            The note for this session is already written.
          </h2>
          <p className="text-base mb-8" style={{ color: '#a8b8cc' }}>
            {paymentsEnabled
              ? 'Read it on your phone. Seven days free, no card to start.'
              : 'Sign in with your mobile number and read it before you open your broker.'}
          </p>
          <button
            onClick={() => navigate('login')}
            className="btn-action px-10 py-4 rounded-xl font-semibold text-base"
          >
            {paymentsEnabled ? 'Start free trial' : "Get today's note"}
          </button>
        </div>
      </section>
    </div>
  )
}
