import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — ShubhShreekh",
  description: "Terms for using the ShubhShreekh research and education app.",
};

export default function TermsPage() {
  return (
    <article className="space-y-6" style={{ color: "var(--foreground)" }}>
      <h1
        className="text-3xl font-bold"
        style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
      >
        Terms of Service
      </h1>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Last updated: 12 October 2026 · Placeholder for Play Store / launch —
        replace with counsel-approved text before charging users.
      </p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">1. The service</h2>
        <p>
          ShubhShreekh offers research notes, trading calls, and educational
          content for Indian investors, provided by Shubhshree Knowledge Hub
          Private Limited (“Company”, “we”, “us”) under SEBI Research Analyst
          Registration No.: [PENDING — insert once allotted/confirmed] (BASL
          Membership No.: [PENDING]). By creating an account or using the app
          you accept these terms; if you do not agree, do not use the service.
        </p>

        <h2 className="text-lg font-semibold">2. Eligibility</h2>
        <p>
          You must be at least 18 years old, legally competent to contract,
          and use the service with funds you are legally entitled to invest.
          You are responsible for your own investment decisions — the service
          does not execute trades or handle your money.
        </p>

        <h2 className="text-lg font-semibold">3. Not investment advice</h2>
        <p>
          Content is for education and research purposes only and is not
          personalised investment advice, an offer, or a solicitation to buy
          or sell any security. Registration granted by SEBI and any
          certification held by our analysts in no way guarantee performance
          or provide any assurance of returns to investors. See our{" "}
          <a href="/legal/disclaimer" style={{ color: "var(--primary)" }}>
            Disclaimer
          </a>{" "}
          for the full risk disclosure.
        </p>

        <h2 className="text-lg font-semibold">4. Risk disclosure</h2>
        <p>
          Investments in securities market are subject to market risks. Read
          all related documents carefully before investing. Past performance
          is not indicative of future returns. Shubhshree Knowledge Hub Pvt.
          Ltd. is not a SEBI registered investment advisor. Market insights
          are for educational and informational purposes only and should not
          be construed as investment advice. You are responsible for your own
          investment decisions.
        </p>

        <h2 className="text-lg font-semibold">5. Your account</h2>
        <p>
          You log in with a mobile number you control via OTP. Do not share
          OTP codes or let anyone else use your login. To curb account
          sharing, each account may be signed in on at most two devices at a
          time; you can free up a slot from the app ( “log out other
          device”), subject to a cooldown. We may suspend accounts that abuse
          the service, share access, or violate these terms or applicable
          law.
        </p>

        <h2 className="text-lg font-semibold">6. Subscription, trial &amp; billing</h2>
        <p>
          The app is free. No subscription is charged, and access does not
          expire after a trial. From January 2027, new accounts may get a
          7-day free trial with full access. After that trial, continued
          access will require a paid Monthly, Quarterly, or Annual plan,
          billed via Razorpay (web) or Google Play Billing (Android app), at
          the price shown at checkout. Paid plans may auto-renew at the
          then-current price unless cancelled before the renewal date;
          cancelling stops future renewals but does not refund the current
          paid period — see our{" "}
          <a href="/legal/refund" style={{ color: "var(--primary)" }}>
            Refund Policy
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold">7. Acceptable use</h2>
        <p>
          You may use the service only for your own personal, non-commercial
          learning. You agree not to scrape, resell, redistribute, or publicly
          republish our research content or trading calls; not to reverse
          engineer or circumvent access controls; and not to use the service
          for any unlawful purpose.
        </p>

        <h2 className="text-lg font-semibold">8. Intellectual property</h2>
        <p>
          All research notes, trading calls, course content, videos, and the
          app itself are owned by the Company or its licensors. Your
          subscription gives you a personal licence to view this content — it
          does not transfer any ownership or licence to reproduce or
          distribute it.
        </p>

        <h2 className="text-lg font-semibold">9. Disclaimer of warranty &amp; limitation of liability</h2>
        <p>
          The service is provided “as is”, without warranty of any kind. We
          do not guarantee uninterrupted availability, accuracy of every data
          point, or any investment outcome. To the extent permitted by law,
          the Company is not liable for indirect, incidental, or consequential
          losses arising from your use of the service, including trading or
          investment losses.
        </p>

        <h2 className="text-lg font-semibold">10. Termination</h2>
        <p>
          You may stop using the service and request account closure at any
          time by contacting us. We may suspend or terminate access for
          violation of these terms, non-payment, or suspected fraud or abuse,
          with or without notice where law allows.
        </p>

        <h2 className="text-lg font-semibold">11. Changes to these terms</h2>
        <p>
          We may update these terms from time to time; the “Last updated”
          date above will change accordingly. Continued use after an update
          means you accept the revised terms.
        </p>

        <h2 className="text-lg font-semibold">12. Governing law &amp; disputes</h2>
        <p>
          These terms are governed by the laws of India. Courts at [PENDING —
          registered-office city] shall have exclusive jurisdiction over any
          dispute, subject to SEBI&apos;s grievance and dispute-resolution
          mechanisms described in our{" "}
          <a href="/legal/grievance" style={{ color: "var(--primary)" }}>
            Grievance redressal
          </a>{" "}
          policy.
        </p>

        <h2 className="text-lg font-semibold">13. Contact</h2>
        <p>
          Questions about these terms: email contact@shubhshreeknowledgehub.com,
          or see{" "}
          <a href="/legal/grievance" style={{ color: "var(--primary)" }}>
            Grievance redressal
          </a>{" "}
          for the escalation path.
        </p>
      </section>
    </article>
  );
}
