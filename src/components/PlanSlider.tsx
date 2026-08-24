"use client";

import { useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { plans } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

type Billing = "monthly" | "yearly";

function PlanCard({
  plan,
  billing,
  emphasized = false,
}: {
  plan: (typeof plans)[number];
  billing: Billing;
  emphasized?: boolean;
}) {
  const { navigate } = useAuth();
  const isPro = plan.price > 0;

  return (
    <div
      className="rounded-2xl p-6 sm:p-7 relative h-full select-none surface-card"
      style={{
        background: "var(--surface)",
        border: isPro
          ? "1px solid color-mix(in srgb, var(--gold) 40%, transparent)"
          : "1px solid var(--border)",
        boxShadow: emphasized ? "var(--shadow-lg)" : "var(--shadow-md)",
        color: "var(--foreground)",
      }}
    >
      {isPro && (
        <div
          className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: "color-mix(in srgb, var(--gold) 16%, transparent)",
            color: "var(--gold)",
            border: "1px solid color-mix(in srgb, var(--gold) 35%, transparent)",
          }}
        >
          Popular
        </div>
      )}

      <div className="mb-5">
        <h3
          className="text-lg font-bold mb-1"
          style={{ color: "var(--foreground)" }}
        >
          {plan.name}
        </h3>
        <div className="flex items-baseline gap-1">
          {plan.price === 0 ? (
            <span
              className="text-4xl font-bold"
              style={{
                color: "var(--foreground)",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Free
            </span>
          ) : (
            <>
              <span
                className="text-base font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                ₹
              </span>
              <span
                className="text-4xl font-bold"
                style={{
                  color: "var(--gold)",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {billing === "monthly" ? "999" : "667"}
              </span>
              <span
                className="text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                /mo
              </span>
            </>
          )}
        </div>
        {isPro && billing === "yearly" && (
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--muted-foreground)" }}
          >
            Billed as ₹7,999/year
          </p>
        )}
      </div>

      <div className="mb-6 space-y-2.5">
        {plan.features.map((f) => (
          <div key={f} className="flex items-start gap-2.5">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] mt-0.5 flex-shrink-0"
              style={{
                background: "color-mix(in srgb, var(--accent) 14%, transparent)",
                color: "var(--accent)",
              }}
            >
              ✓
            </span>
            <span
              className="text-sm"
              style={{ color: "var(--secondary-foreground)" }}
            >
              {f}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => navigate("login")}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
        style={{
          background: isPro
            ? "linear-gradient(135deg, var(--gold-from), var(--gold-to))"
            : "var(--primary)",
          color: isPro ? "#0b2438" : "#ffffff",
          border: "none",
        }}
      >
        {plan.price === 0
          ? "Get Started Free"
          : `Start Pro · ₹${billing === "monthly" ? "999/mo" : "7,999/yr"}`}
      </button>
    </div>
  );
}

export default function PlanSlider() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [activeIndex, setActiveIndex] = useState(1);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center p-1 rounded-full"
          style={{
            background: "var(--secondary)",
            boxShadow: "inset 0 1px 2px rgba(30, 58, 95, 0.06)",
          }}
          role="tablist"
          aria-label="Billing period"
        >
          {(["monthly", "yearly"] as const).map((b) => (
            <button
              key={b}
              type="button"
              role="tab"
              aria-selected={billing === b}
              onClick={() => setBilling(b)}
              className="px-5 py-2 rounded-full text-sm font-medium capitalize transition-all"
              style={{
                background: billing === b ? "var(--surface)" : "transparent",
                color: billing === b ? "var(--foreground)" : "var(--muted-foreground)",
                boxShadow: billing === b ? "var(--shadow-sm)" : "none",
                fontWeight: billing === b ? 600 : 500,
              }}
            >
              {b === "yearly" ? "Yearly · Save 33%" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: both plans side-by-side, no slider */}
      <div className="hidden md:grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto pt-3">
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            billing={billing}
            emphasized={plan.price > 0}
          />
        ))}
      </div>

      {/* Mobile: swipe between Free and Pro */}
      <div className="md:hidden plan-swiper-wrap">
        <button
          ref={prevRef}
          type="button"
          className="plan-nav-btn plan-nav-btn--prev"
          aria-label="Previous plan"
        >
          ←
        </button>
        <button
          ref={nextRef}
          type="button"
          className="plan-nav-btn plan-nav-btn--next"
          aria-label="Next plan"
        >
          →
        </button>

        <Swiper
          modules={[Navigation, Pagination]}
          className="plan-swiper"
          grabCursor
          allowTouchMove
          simulateTouch
          touchStartPreventDefault={false}
          threshold={6}
          resistanceRatio={0.85}
          speed={420}
          centeredSlides
          initialSlide={1}
          spaceBetween={24}
          slidesPerView={1}
          pagination={{ clickable: true }}
          onBeforeInit={(swiper: SwiperType) => {
            const nav = swiper.params.navigation;
            if (nav && typeof nav !== "boolean") {
              nav.prevEl = prevRef.current;
              nav.nextEl = nextRef.current;
            }
          }}
          onSwiper={(swiper) => {
            if (
              swiper.params.navigation &&
              typeof swiper.params.navigation !== "boolean"
            ) {
              swiper.params.navigation.prevEl = prevRef.current;
              swiper.params.navigation.nextEl = nextRef.current;
              swiper.navigation.destroy();
              swiper.navigation.init();
              swiper.navigation.update();
            }
            setActiveIndex(swiper.activeIndex);
          }}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
        >
          {plans.map((plan, idx) => (
            <SwiperSlide key={plan.name}>
              <PlanCard
                plan={plan}
                billing={billing}
                emphasized={activeIndex === idx}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        <p
          className="text-center text-xs mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          Swipe or drag to compare Free and Pro
        </p>
      </div>
    </div>
  );
}
