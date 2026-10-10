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
        Last updated: 8 October 2026 · Placeholder for Play Store / launch —
        replace with counsel-approved text before charging users.
      </p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Service</h2>
        <p>
          ShubhShreekh offers research notes, educational content, and related
          tools for Indian investors, provided by Shubhshree Knowledge Hub
          Private Limited under SEBI Research Analyst Registration No.:
          [PENDING — insert once allotted/confirmed] (BASL Membership No.:
          [PENDING]). Content is for education / research purposes and is not
          a brokerage or order-execution service.
        </p>

        <h2 className="text-lg font-semibold">Risk disclosure</h2>
        <p>
          Investments in securities market are subject to market risks. Read
          all related documents carefully before investing. Past performance
          is not indicative of future returns. Shubhshree Knowledge Hub Pvt.
          Ltd. is not a SEBI registered investment advisor. Market insights
          are for educational and informational purposes only and should not
          be construed as investment advice. You are responsible for your own
          investment decisions.
        </p>

        <h2 className="text-lg font-semibold">Accounts</h2>
        <p>
          You must provide a valid mobile number you control. Do not share OTP
          codes. We may suspend accounts that abuse the service or violate law.
        </p>

        <h2 className="text-lg font-semibold">Subscriptions</h2>
        <p>
          Paid plans renew or end as described at checkout (web via PayU; Play
          Store via Google Play Billing where required). Refunds follow our
          published refund / grievance process and applicable law.
        </p>

        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          See{" "}
          <a href="/legal/grievance" style={{ color: "var(--primary)" }}>
            Grievance redressal
          </a>
          .
        </p>
      </section>
    </article>
  );
}
