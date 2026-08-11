"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Lock, Radar, Star, TrendingUp, Zap } from "lucide-react";
import PlanComparison, { type PlanId } from "@/components/PlanComparison";
import SignupModal from "@/components/SignupModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getTopIdeas, type TradeIdea } from "@/lib/api";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Research-backed ideas",
    description: "Entry, target and stop-loss on every pick. Screened, then analyst-validated.",
  },
  {
    icon: Activity,
    title: "Buy / Sell / Hold",
    description: "Instant ratings on the stocks you hold, updated as the market moves.",
  },
  {
    icon: Radar,
    title: "Live market data",
    description: "Nifty, Sensex and sector insights streamed in real time on every screen.",
  },
];

const STATS = [
  { value: "1L+", label: "Investors" },
  { value: "4.8★", label: "Average rating" },
  { value: "2,000+", label: "Stocks rated" },
];

const TESTIMONIALS = [
  {
    quote: "Clean signals, clear entry and exit. Made investing far less stressful for me.",
    name: "Ravi K.",
    role: "Software Engineer",
    initials: "RK",
  },
  {
    quote: "The Pro plan pays for itself. Screeners alone are worth the price.",
    name: "Amresh M.",
    role: "Product Manager",
    initials: "AM",
  },
  {
    quote: "Beautiful app, smooth experience. Everything in one place.",
    name: "Prasanth K.",
    role: "Bank Manager",
    initials: "PK",
  },
];

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [topIdeas, setTopIdeas] = useState<TradeIdea[]>([]);
  const modalOpenedRef = useRef(false);

  function openModal(plan?: PlanId) {
    modalOpenedRef.current = true;
    setSelectedPlan(plan ?? null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function scrollToPlans() {
    document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    getTopIdeas().then(setTopIdeas);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!modalOpenedRef.current) openModal();
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <span className="text-xl font-extrabold tracking-tight">
            <span className="text-navy-900">Shubh</span>
            <span className="text-gold-600">Shreekh</span>
          </span>
          <Button variant="navy" onClick={() => openModal()}>
            Start free
          </Button>
        </div>
      </header>

      <section className="bg-gradient-to-b from-gold-50 to-background py-20 sm:py-28">
        <div className="mx-auto grid max-w-5xl gap-10 px-5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <Badge className="mb-5 bg-gold-100 text-gold-800 hover:bg-gold-100">
              ● SEBI-registered research analyst
            </Badge>
            <h1 className="text-5xl leading-[1.05] font-black tracking-tight sm:text-6xl">
              Clear <span className="text-navy-900">buy, sell &amp; hold</span> signals for Indian
              markets
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Research-backed trade ideas with entry, target and stop-loss — in one tap. Start
              free, upgrade when you&apos;re ready.
            </p>
            <Badge className="mt-5 gap-1 bg-gold-100 text-gold-800 hover:bg-gold-100">
              <Zap className="size-3" />
              Launch offer — free ideas end today
            </Badge>
            <div className="mt-7 flex flex-col gap-3 sm:max-w-md sm:flex-row">
              <Button
                variant="gold"
                size="xl"
                className="w-full shadow-lg shadow-gold-900/10 sm:flex-1"
                onClick={() => openModal()}
              >
                Get 3 free trade ideas
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:flex-1"
                onClick={scrollToPlans}
              >
                Compare plans
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 text-sm text-muted-foreground">
              <span>
                <b className="font-semibold text-foreground">1L+</b> investors
              </span>
              <span>
                <b className="font-semibold text-foreground">4.8★</b> avg rating
              </span>
              <span>
                <b className="font-semibold text-foreground">SEBI</b> reg. model
              </span>
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-4 -z-10 rounded-3xl bg-gold-500/15 blur-2xl"
            />
            <Card className="gap-0 rounded-2xl py-5 shadow-2xl">
              <CardHeader className="px-5">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Today&apos;s top ideas
                </h3>
              </CardHeader>
              <CardContent className="flex flex-col px-5">
                {topIdeas.map((idea, i) => (
                  <div
                    key={idea.symbol}
                    className={`flex items-center justify-between py-3 ${i < topIdeas.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <div className={idea.locked ? "select-none blur-sm" : undefined}>
                      <div className="font-bold">{idea.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {idea.action} · {idea.target ? `Target ${idea.target}` : "Review"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-emerald-600">
                      {idea.locked && <Lock className="size-3.5" />}
                      {idea.changePercent === null ? "—%" : `+${idea.changePercent}%`}
                    </div>
                  </div>
                ))}
                <Button
                  variant="gold"
                  size="lg"
                  className="mt-3 w-full"
                  onClick={() => openModal()}
                >
                  Unlock all ideas
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5">
          <p className="text-center text-sm font-bold tracking-widest text-gold-600 uppercase">
            Why ShubhShreekh
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to invest with clarity
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card
                key={feature.title}
                className="gap-2 rounded-2xl py-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardHeader className="px-6">
                  <span className="mb-2 inline-flex size-11 items-center justify-center rounded-xl bg-gold-100">
                    <feature.icon className="size-5 text-gold-700" />
                  </span>
                  <h4 className="font-semibold">{feature.title}</h4>
                </CardHeader>
                <CardContent className="px-6">
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-muted py-20 sm:py-28" id="plans">
        <div className="mx-auto max-w-5xl px-5">
          <p className="text-center text-sm font-bold tracking-widest text-gold-600 uppercase">
            Pricing
          </p>
          <h2 className="mt-2 mb-10 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Choose the plan that fits you
          </h2>
          <PlanComparison onSelectPlan={openModal} />
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-3 px-5 text-center">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-black tracking-tight text-navy-900 sm:text-4xl">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-8 sm:py-28">
        <div className="mx-auto max-w-5xl px-5">
          <p className="text-center text-sm font-bold tracking-widest text-gold-600 uppercase">
            Testimonials
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Loved by investors
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <Card
                key={testimonial.name}
                className="gap-3 rounded-2xl py-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <CardContent className="flex flex-col gap-3 px-6">
                  <div className="flex gap-0.5 text-gold-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
                      {testimonial.initials}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{testimonial.name}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-navy-900 py-20 text-center text-white sm:py-28">
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/15 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-5">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Stop guessing. Start growing.
          </h2>
          <p className="mt-3 text-navy-200">Join today and get your first 3 trade ideas free.</p>
          <Button
            variant="gold"
            size="xl"
            className="mx-auto mt-7 w-full max-w-xs shadow-lg shadow-gold-950/30"
            onClick={() => openModal()}
          >
            Get started free
          </Button>
        </div>
      </section>

      <footer className="bg-navy-950 py-8 text-xs text-navy-300">
        <div className="mx-auto max-w-5xl px-5">
          <div className="mb-4 rounded-xl border border-white/10 p-3.5 leading-relaxed">
            <b className="text-gold-200">Disclosures.</b> ShubhShreekh is a SEBI-registered
            Research Analyst (Reg. No. INHXXXXXXXXX). Investments in securities markets are
            subject to market risks; read all related documents carefully before investing.
            Registration granted by SEBI and certification from NISM in no way guarantee
            performance or returns. Past performance is not indicative of future results.
          </div>
          <div>© 2026 ShubhShreekh. SEBI-registered Research Analyst.</div>
        </div>
      </footer>

      <SignupModal isOpen={modalOpen} plan={selectedPlan} onClose={closeModal} />
    </>
  );
}
