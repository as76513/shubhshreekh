"use client";

import { useEffect, useState } from "react";
import { proPlan } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";
import { getPricing, type Pricing } from "@/lib/api";

// One product since TD-054 removed the Free tier — "Pro (7-day free
// trial)". Pricing (anchor/discounted price, discount %) is fetched live
// from GET /pricing (TD-055, admin-configurable) rather than hardcoded, so
// a festive discount bump on the backend shows up here with no deploy.
// Checkout itself isn't built yet (TD-011/PayU) — the CTA starts the free
// trial via signup, which needs no payment upfront.

const periodSuffix: Record<string, string> = {
  monthly: "/mo",
  quarterly: "/qtr",
  annual: "/yr",
};

export default function PlanSlider() {
  const { navigate } = useAuth();
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [billingId, setBillingId] = useState("monthly");
  const [error, setError] = useState(false);

  useEffect(() => {
    getPricing()
      .then((data) => {
        setPricing(data);
        if (data.plans.length > 0) setBillingId(data.plans[0].id);
      })
      .catch(() => setError(true));
  }, []);

  const selected = pricing?.plans.find((p) => p.id === billingId);

  return (
    <div>
      {pricing && (
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
            {pricing.plans.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={billingId === p.id}
                onClick={() => setBillingId(p.id)}
                className="px-5 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  background: billingId === p.id ? "var(--surface)" : "transparent",
                  color: billingId === p.id ? "var(--foreground)" : "var(--muted-foreground)",
                  boxShadow: billingId === p.id ? "var(--shadow-sm)" : "none",
                  fontWeight: billingId === p.id ? 600 : 500,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        <div
          className="rounded-2xl p-6 sm:p-7 pt-8 relative surface-card"
          style={{
            background: "var(--surface)",
            border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)",
            boxShadow: "var(--shadow-lg)",
            color: "var(--foreground)",
          }}
        >
          {pricing && pricing.discountPercent > 0 && (
            <div
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide whitespace-nowrap animate-pulse"
              style={{
                background: "linear-gradient(135deg, #ff4d4d, #ff8a00)",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(255, 77, 77, 0.45)",
              }}
            >
              ⚡ Blast Offer — {pricing.discountPercent}% OFF
            </div>
          )}

          <div className="mb-5">
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>
              {proPlan.name}
            </h3>
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: "var(--gold)" }}
            >
              {proPlan.badge}
            </p>

            {selected ? (
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-base"
                  style={{ color: "var(--muted-foreground)", textDecoration: "line-through" }}
                >
                  ₹{selected.anchorPrice.toLocaleString("en-IN")}
                </span>
                <span
                  className="text-4xl font-bold"
                  style={{ color: "var(--gold)", fontFamily: "JetBrains Mono, monospace" }}
                >
                  ₹{selected.discountedPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {periodSuffix[selected.id] ?? ""}
                </span>
              </div>
            ) : error ? (
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Pricing unavailable right now — try again shortly.
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Loading pricing…
              </p>
            )}
          </div>

          <div className="mb-6 space-y-2.5">
            {proPlan.features.map((f) => (
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
                <span className="text-sm" style={{ color: "var(--secondary-foreground)" }}>
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
              background: "linear-gradient(135deg, var(--gold-from), var(--gold-to))",
              color: "#0b2438",
              border: "none",
            }}
          >
            Start 7-day free trial
          </button>
          <p className="text-center text-xs mt-2" style={{ color: "var(--muted-foreground)" }}>
            No payment required to start
          </p>
        </div>
      </div>
    </div>
  );
}
