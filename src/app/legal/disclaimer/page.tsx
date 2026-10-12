import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer — ShubhShreekh",
  description: "Risk disclosures and disclaimers for ShubhShreekh's research content.",
};

export default function DisclaimerPage() {
  return (
    <article className="space-y-6" style={{ color: "var(--foreground)" }}>
      <h1
        className="text-3xl font-bold"
        style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
      >
        Disclaimer
      </h1>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Last updated: 12 October 2026 · Placeholder for Play Store / launch —
        replace with counsel-approved text before charging users.
      </p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Educational &amp; research purpose only</h2>
        <p>
          All content on ShubhShreekh — trading calls, research notes,
          courses, and videos — is published by Shubhshree Knowledge Hub
          Private Limited under SEBI Research Analyst Registration No.:
          [PENDING]. It is intended solely for educational and informational
          purposes and does not constitute personalised investment advice, an
          offer, or a solicitation to buy or sell any security.
        </p>

        <h2 className="text-lg font-semibold">No guarantee of returns</h2>
        <p>
          Registration granted by SEBI, membership of BASL, and any NISM
          certification held by our analysts in no way guarantee the
          performance of the Research Analyst or provide any assurance of
          returns to investors.
        </p>

        <h2 className="text-lg font-semibold">Risk disclosure</h2>
        <p>
          Investments in securities market are subject to market risks. Read
          all related documents carefully before investing. Past performance
          is not indicative of future returns. Shubhshree Knowledge Hub Pvt.
          Ltd. is not a SEBI registered investment advisor. You are solely
          responsible for your own investment decisions, including any
          decision made after reading or acting on our content.
        </p>

        <h2 className="text-lg font-semibold">Past performance</h2>
        <p>
          Any target-hit, stop-loss, or returns figures shown for past calls
          reflect that specific call&apos;s stated levels and are not
          projections, promises, or guarantees for future calls. Markets are
          volatile and outcomes vary.
        </p>

        <h2 className="text-lg font-semibold">Analyst independence &amp; conflicts of interest</h2>
        <p>
          Our research analysts are expected to make recommendations
          independently of any personal financial interest in the companies
          discussed, in line with SEBI&apos;s Research Analyst Regulations.
          [PENDING — insert the specific conflicts-of-interest / holdings /
          compensation disclosure statement your compliance advisor requires,
          per analyst or per report.]
        </p>

        <h2 className="text-lg font-semibold">Third-party content &amp; links</h2>
        <p>
          The app may link to third-party sites (e.g. payment gateways,
          exchanges). We are not responsible for the content, accuracy, or
          privacy practices of any third-party site.
        </p>

        <h2 className="text-lg font-semibold">Related</h2>
        <p>
          <a href="/legal/sebi-registration" style={{ color: "var(--primary)" }}>
            SEBI Registration
          </a>
          {" · "}
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
