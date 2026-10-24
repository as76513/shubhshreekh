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
    { value: siteStats.learners, label: 'Learners' },
    { value: siteStats.ideasShared, label: 'Ideas shared' },
    { value: siteStats.courses, label: 'Courses' },
    { value: siteStats.avgRating, label: 'Avg rating' },
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
              Research for Indian markets
            </p>
            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.02] mb-5"
              style={{ fontFamily: "DM Serif Display, serif", color: "#ffffff" }}
            >
              Invest today.
              <br />
              <span style={{ color: "#fbbf24" }}>Grow tomorrow.</span>
            </h1>
            <p className="text-lg max-w-xl mb-8 leading-relaxed" style={{ color: "#d5e2ee" }}>
              Open the desk for today&apos;s note, equity and F&amp;O levels, and courses that explain the setup. Built for retail investors who want the reason, not just a tip.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={() => navigate("login")}
                className="btn-action px-8 py-3.5 rounded-xl font-semibold text-sm"
              >
                {paymentsEnabled ? "Start free trial" : "Open your desk"}
              </button>
              <button
                onClick={() => document.getElementById("blogs")?.scrollIntoView({ behavior: "smooth" })}
                className="px-5 py-3.5 rounded-xl text-sm font-semibold"
                style={{ color: "#ffffff", border: "1px solid rgba(255,255,255,0.28)" }}
              >
                Read today&apos;s note
              </button>
            </div>
          </div>

          <article
            className="min-w-0 rounded-3xl p-6 sm:p-8"
            style={{
              background: "linear-gradient(180deg, #fffaf3 0%, #fff4df 100%)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
            }}
          >
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: "#0f766e" }}>
              Today&apos;s note
            </p>
            <p className="text-xs font-medium mb-4" style={{ color: "#7c5a12" }}>
              {noteDate}
            </p>
            <p
              className="text-2xl sm:text-3xl leading-snug mb-6 break-words"
              style={{ fontFamily: "DM Serif Display, serif", color: "#0b2438" }}
            >
              {noteBody}
            </p>
            <button
              onClick={() => document.getElementById("blogs")?.scrollIntoView({ behavior: "smooth" })}
              className="text-sm font-semibold"
              style={{ color: "#0f766e" }}
            >
              Continue reading →
            </button>
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

      <Blogs />

      {/* Services */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 mb-8">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            Three ways to use the desk
          </h2>
          <p className="text-sm max-w-xl" style={{ color: 'var(--muted-foreground)' }}>
            Read the research, study a course, or watch the setup explained.
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
            {paymentsEnabled
              ? 'Join learners building market knowledge with ShubhShree. 7 days free, no card required.'
              : 'Join learners building market knowledge with ShubhShree.'}
          </p>
          <button
            onClick={() => navigate('login')}
            className="btn-action px-10 py-4 rounded-xl font-semibold text-base"
          >
            {paymentsEnabled ? 'Start free trial' : 'Create your account'}
          </button>
        </div>
      </section>
    </div>
  )
}
