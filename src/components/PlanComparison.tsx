import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  ctaVariant: "outline" | "gold" | "navy";
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
    ctaVariant: "outline",
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
    ctaVariant: "gold",
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
    ctaVariant: "navy",
  },
];

function PlanCard({ plan, onSelect }: { plan: Plan; onSelect: (planId: PlanId) => void }) {
  return (
    <Card
      className={cn(
        "relative min-w-[85%] snap-start gap-0 rounded-2xl border-0 py-6 shadow-sm ring-1 ring-border transition-all duration-200 md:min-w-0 md:hover:-translate-y-1 md:hover:shadow-lg",
        plan.featured &&
          "shadow-lg shadow-gold-500/15 ring-2 ring-gold-400 md:-translate-y-2 md:hover:-translate-y-3"
      )}
    >
      {plan.badge && (
        <Badge className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500 px-3 py-1 text-navy-950">
          {plan.badge}
        </Badge>
      )}
      <CardHeader className="px-6">
        <h3 className="text-xl font-semibold">{plan.name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
          {plan.priceSuffix && (
            <span className="text-base font-medium text-muted-foreground">{plan.priceSuffix}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{plan.period}</p>
      </CardHeader>
      <CardContent className="flex-1 px-6">
        <ul className="flex flex-col gap-2.5">
          {plan.features.map((feature) => (
            <li
              key={feature.text}
              className={cn(
                "flex items-start gap-2 text-sm",
                feature.included ? "text-foreground" : "text-muted-foreground/70"
              )}
            >
              {feature.included ? (
                <Check className="mt-0.5 size-4 shrink-0 text-gold-600" />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
              )}
              {feature.text}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="px-6">
        <Button
          variant={plan.ctaVariant}
          size="lg"
          className="w-full"
          onClick={() => onSelect(plan.id)}
        >
          {plan.ctaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function PlanComparison({
  onSelectPlan,
}: {
  onSelectPlan: (planId: PlanId) => void;
}) {
  return (
    <div className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} onSelect={onSelectPlan} />
      ))}
    </div>
  );
}
