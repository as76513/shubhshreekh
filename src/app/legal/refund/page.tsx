import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy — ShubhShreekh",
  description: "ShubhShreekh's subscription refund and cancellation policy.",
};

export default function RefundPage() {
  return (
    <article className="space-y-6" style={{ color: "var(--foreground)" }}>
      <h1
        className="text-3xl font-bold"
        style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
      >
        Refund Policy
      </h1>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Last updated: 12 October 2026 · Placeholder for Play Store / launch —
        replace with counsel-approved text before charging users.
      </p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Try before you pay</h2>
        <p>
          Every new account gets a 7-day free trial with full access before
          any payment is taken, so you can evaluate the service before
          committing to a paid plan.
        </p>

        <h2 className="text-lg font-semibold">Subscription charges are generally non-refundable</h2>
        <p>
          Because you have the 7-day trial to decide, once a paid
          subscription (Monthly, Quarterly, or Annual) is charged, that
          charge is non-refundable — including if you stop using the service,
          close your account, or are suspended for violating our{" "}
          <a href="/legal/terms" style={{ color: "var(--primary)" }}>
            Terms of Service
          </a>{" "}
          before the paid period ends.
        </p>

        <h2 className="text-lg font-semibold">Exceptions we will review</h2>
        <p>
          We will review a refund request if: (a) you were charged more than
          once for the same billing period due to a technical error, or (b) a
          payment was debited but the subscription was never activated. Email
          contact@shubhshreeknowledgehub.com with your registered mobile
          number, the payment reference / order ID, and a description of the
          issue within 7 days of the charge.
        </p>

        <h2 className="text-lg font-semibold">Cancelling auto-renewal</h2>
        <p>
          Cancelling a plan (via the app, or via Google Play&apos;s
          subscription settings for Play Billing purchases) stops future
          renewals but does not refund the period you have already paid for —
          you keep access until that period ends.
        </p>

        <h2 className="text-lg font-semibold">How refunds are paid</h2>
        <p>
          Where a refund is approved, it is credited back to the original
          payment method (PayU) or handled per Google Play&apos;s refund
          process (Play Billing purchases), typically within [PENDING —
          confirm turnaround with payment partner] business days.
        </p>

        <h2 className="text-lg font-semibold">Related</h2>
        <p>
          <a href="/legal/terms" style={{ color: "var(--primary)" }}>
            Terms of Service
          </a>
          {" · "}
          <a href="/legal/grievance" style={{ color: "var(--primary)" }}>
            Grievance redressal
          </a>
        </p>
      </section>
    </article>
  );
}
