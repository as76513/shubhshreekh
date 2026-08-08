export type PlanId = "Free" | "Pro" | "Premium";

export type Plan = {
  id: PlanId;
  name: string;
  price: string;
  priceSuffix?: string;
  period: string;
  featured?: boolean;
  badge?: string;
  features: { text: string; included: boolean }[];
  ctaLabel: string;
  ctaVariant: "btn-outline" | "btn-primary" | "btn-navy";
};

export const plans: Plan[] = [
  {
    id: "Free",
    name: "Free",
    price: "₹0",
    period: "forever",
    features: [
      { text: "3 trade ideas / month", included: true },
      { text: "Delayed market data", included: true },
      { text: "Basic watchlist", included: true },
      { text: "Real-time signals", included: false },
      { text: "Portfolio review", included: false },
    ],
    ctaLabel: "Start free",
    ctaVariant: "btn-outline",
  },
  {
    id: "Pro",
    name: "Pro",
    price: "₹499",
    priceSuffix: "/mo",
    period: "billed monthly",
    featured: true,
    badge: "Most popular",
    features: [
      { text: "Unlimited trade ideas", included: true },
      { text: "Real-time market data", included: true },
      { text: "Buy/Sell/Hold on 2,000+ stocks", included: true },
      { text: "Smart screeners", included: true },
      { text: "1-on-1 advisor calls", included: false },
    ],
    ctaLabel: "Choose Pro",
    ctaVariant: "btn-primary",
  },
  {
    id: "Premium",
    name: "Premium",
    price: "₹1,499",
    priceSuffix: "/mo",
    period: "billed monthly",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Quarterly portfolio review", included: true },
      { text: "1-on-1 SEBI-reg. advisor", included: true },
      { text: "Priority support", included: true },
      { text: "Exclusive webinars", included: true },
    ],
    ctaLabel: "Choose Premium",
    ctaVariant: "btn-navy",
  },
];

function PlanCard({ plan, onSelect }: { plan: Plan; onSelect: (planId: PlanId) => void }) {
  return (
    <div className={`plan${plan.featured ? " featured" : ""}`}>
      {plan.badge && <div className="badge-pop">{plan.badge}</div>}
      <h3>{plan.name}</h3>
      <div className="price">
        {plan.price}
        {plan.priceSuffix && <small>{plan.priceSuffix}</small>}
      </div>
      <div className="per">{plan.period}</div>
      <ul>
        {plan.features.map((feature) => (
          <li key={feature.text} className={feature.included ? undefined : "no"}>
            <span className="ic">{feature.included ? "✓" : "✕"}</span> {feature.text}
          </li>
        ))}
      </ul>
      <button className={`btn ${plan.ctaVariant}`} onClick={() => onSelect(plan.id)}>
        {plan.ctaLabel}
      </button>
    </div>
  );
}

export default function PlanComparison({
  onSelectPlan,
}: {
  onSelectPlan: (planId: PlanId) => void;
}) {
  return (
    <div className="plan-grid">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} onSelect={onSelectPlan} />
      ))}
    </div>
  );
}
