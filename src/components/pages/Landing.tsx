"use client";

import { useEffect, useState } from "react";
import { videos } from "@/lib/data";
import ServiceSlider from "@/components/ServiceSlider";
import CourseSlider from "@/components/CourseSlider";
import PlanSlider from "@/components/PlanSlider";
import Blogs from "@/components/pages/Blogs";
import { useAuth } from "@/lib/auth-context";
import { paymentsEnabled } from "@/lib/payments";
import { getTestimonials, listOverviews, type Overview, type Testimonial } from "@/lib/api";

const defaultTestimonials: Testimonial[] = [
  { name: "Arjun Patel", city: "Mumbai", text: "The market insights are clearly explained. The course structure helped me study setups with more confidence.", returns: "+70%", initials: "AP" },
  { name: "Meera Krishnan", city: "Chennai", text: "The research notes have completely transformed my portfolio. I now know exactly when to invest and when to wait. Absolutely worth every rupee.", returns: "+32%", initials: "MK" },
  { name: "Rohit Agarwal", city: "Delhi", text: "Priya's Technical Analysis Masterclass is better than any paid course I've taken elsewhere. The content quality is exceptional.", returns: "+48%", initials: "RA" },
  { name: "Nisha Verma", city: "Bangalore", text: "Started as a complete beginner. Within 3 months of using Shubhshree, I can read Indian market charts with much more clarity.", returns: "+25%", initials: "NV" },
]

type Step = "new" | "try" | "today"

const steps: { id: Step; n: string; who: string; title: string; line: string; place: string; cta: string }[] = [
  {
    id: "new",
    n: "1",
    who: "Learn",
    title: "What the bars mean",
    line: "Red and green bars, and no idea what they mean yet. The courses explain them in ordinary words.",
    place: "ShubhShree Courses",
    cta: "Start as a beginner",
  },
  {
    id: "try",
    n: "2",
    who: "Practise",
    title: "Try the same chart",
    line: "The platform is where that lesson gets tried. Nothing here places a trade.",
    place: "ShubhShree Platform",
    cta: "Practise on the platform",
  },
  {
    id: "today",
    n: "3",
    who: "The note",
    title: "What to watch today",
    line: "The analyst has written the one thing that matters today, and why.",
    place: "ShubhShree RA",
    cta: "Read today’s note",
  },
]

function StoryChart({ active, onPick }: { active: Step; onPick: (step: Step) => void }) {
  const on = (id: Step) => active === id
  return (
    <svg viewBox="0 0 680 460" className="w-full h-auto" role="img" aria-label="Three steps on one chart: new, then practise, then today’s note.">
      <defs>
        <linearGradient id="greenBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ade80" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="redBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f87171" />
          <stop offset="1" stopColor="#b91c1c" />
        </linearGradient>
      </defs>
      <path d="M90 340 C 180 340, 220 300, 300 260 S 460 120, 560 150" fill="none" stroke="#e8b84a" strokeWidth="2" strokeDasharray="6 7" opacity="0.85" />

      <g opacity={on("new") ? 1 : 0.38} style={{ cursor: "pointer" }} onClick={() => onPick("new")}>
        <line x1="78" y1="250" x2="78" y2="330" stroke="#fecaca" strokeWidth="2" />
        <rect x="62" y="268" width="32" height="42" rx="5" fill="url(#redBody)" />
        <line x1="132" y1="270" x2="132" y2="350" stroke="#fecaca" strokeWidth="2" />
        <rect x="116" y="292" width="32" height="36" rx="5" fill="url(#redBody)" />
        <text x="97" y="400" textAnchor="middle" fill="#f6e7b4" fontSize="13" fontFamily="Georgia, serif">Learn</text>
      </g>

      <g opacity={on("try") ? 1 : 0.38} style={{ cursor: "pointer" }} onClick={() => onPick("try")}>
        <line x1="250" y1="200" x2="250" y2="310" stroke="#86efac" strokeWidth="2" />
        <rect x="232" y="220" width="36" height="64" rx="5" fill="url(#greenBody)" />
        <line x1="330" y1="150" x2="330" y2="300" stroke="#86efac" strokeWidth="2" />
        <rect x="310" y="168" width="40" height="96" rx="6" fill="url(#greenBody)" />
        <text x="290" y="400" textAnchor="middle" fill="#f6e7b4" fontSize="13" fontFamily="Georgia, serif">Practise</text>
      </g>

      <g opacity={on("today") ? 1 : 0.45} style={{ cursor: "pointer" }} onClick={() => onPick("today")}>
        <line x1="500" y1="70" x2="500" y2="340" stroke="#bbf7d0" strokeWidth="3" />
        <rect x="458" y="96" width="84" height="190" rx="10" fill="url(#greenBody)" />
        <rect x="458" y="96" width="84" height="14" rx="7" fill="#ffffff" opacity="0.22" />
        {on("today") && (
          <g>
            <line x1="500" y1="96" x2="500" y2="52" stroke="#f6e7b4" strokeWidth="1.5" />
            <text x="500" y="42" textAnchor="middle" fill="#fffaf3" fontSize="14" fontFamily="Georgia, serif">What to watch</text>
          </g>
        )}
        <text x="500" y="400" textAnchor="middle" fill="#f6e7b4" fontSize="13" fontFamily="Georgia, serif">The note</text>
      </g>
    </svg>
  )
}

export default function Landing() {
  const { navigate } = useAuth();
  const [mark, setMark] = useState<Step>("new");
  const [testimonials, setTestimonials] = useState<Testimonial[]>(defaultTestimonials);
  const [latestNote, setLatestNote] = useState<Overview | null>(null);

  useEffect(() => {
    getTestimonials().then(setTestimonials).catch(() => {});
    listOverviews()
      .then((rows) => setLatestNote(rows[0] ?? null))
      .catch(() => {});
  }, []);

  const published = latestNote ? new Date(latestNote.publishedAt) : null;
  const noteDate =
    published && !Number.isNaN(published.getTime())
      ? published.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : "Today";

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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 lg:pt-12 grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-6 lg:gap-10 items-center">
          <div className="min-w-0">
            <StoryChart active={mark} onPick={setMark} />
            <p className="text-[11px] mt-1" style={{ color: "#93a4b8" }}>
              Learn, then practise, then read the note.
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.22em] uppercase mb-3" style={{ color: "#f6e7b4" }}>
              {steps.find((m) => m.id === mark)?.who}
            </p>
            <h1
              className="text-4xl sm:text-5xl font-bold leading-[1.05] mb-3 break-words"
              style={{ fontFamily: "DM Serif Display, serif", color: "#ffffff" }}
            >
              {steps.find((m) => m.id === mark)?.title}
            </h1>
            <p className="text-base leading-relaxed mb-6 max-w-md break-words" style={{ color: "#d5e2ee" }}>
              {steps.find((m) => m.id === mark)?.line}
              {mark === "today" ? ` Written ${noteDate}.` : ""}
            </p>
            <div className="relative flex flex-col gap-2 mb-6 pl-1" role="tablist" aria-label="The story">
              <span className="absolute left-[1.15rem] top-5 bottom-5 w-px" style={{ background: "rgba(232,184,74,0.45)" }} aria-hidden />
              {steps.map((item) => {
                const on = item.id === mark
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setMark(item.id)}
                    className="relative text-left rounded-xl pl-12 pr-4 py-3 min-w-0"
                    style={{
                      background: on ? "rgba(246,231,180,0.12)" : "transparent",
                      border: on ? "1px solid rgba(232,184,74,0.7)" : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span
                      className="absolute left-3 top-3.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: on ? "#e8b84a" : "#0b2438", color: on ? "#0b2438" : "#f6e7b4", border: "1px solid #e8b84a" }}
                    >
                      {item.n}
                    </span>
                    <span className="block text-sm font-semibold" style={{ color: on ? "#fffaf3" : "#c5d0de" }}>
                      {item.place}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: "#e8b84a" }}>
                      {item.who}
                    </span>
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => (mark === "new" ? navigate("courses") : navigate("login"))}
              className="btn-action px-8 py-3.5 rounded-xl font-semibold text-sm"
            >
              {paymentsEnabled && mark !== "new" ? "Start free trial" : steps.find((m) => m.id === mark)?.cta}
            </button>
            <p className="text-xs mt-3" style={{ color: "#93a4b8" }}>
              Research, not an order to buy or sell.
            </p>
          </div>
        </div>
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
            Today’s candle is already marked.
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
