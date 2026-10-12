import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grievance Redressal — ShubhShreekh",
  description: "How to raise a complaint with ShubhShreekh.",
};

export default function GrievancePage() {
  return (
    <article className="space-y-6" style={{ color: "var(--foreground)" }}>
      <h1
        className="text-3xl font-bold"
        style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
      >
        Grievance redressal
      </h1>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Last updated: 12 October 2026 · Placeholder — confirm officer name,
        email, and escalation with your SEBI compliance advisor.
      </p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Level 1 — Raise it with us</h2>
        <p>
          Email contact@shubhshreeknowledgehub.com with your registered mobile
          number, a short description of the issue, and any screenshots. We
          aim to acknowledge every complaint within 2 working days and resolve
          it within 30 days, and will confirm the outcome by email.
        </p>

        <h2 className="text-lg font-semibold">Level 2 — Our Grievance Officer</h2>
        <p>
          If you are not satisfied with Level 1, or 30 days have passed
          without resolution, escalate to our designated Grievance Officer:{" "}
          <strong>[PENDING — officer name]</strong>,{" "}
          <strong>[PENDING — direct email]</strong>,{" "}
          <strong>[PENDING — direct phone]</strong>.
        </p>

        <h2 className="text-lg font-semibold">Level 3 — SEBI SCORES &amp; SMART ODR</h2>
        <p>
          As a SEBI-registered Research Analyst (Registration No.: [PENDING]),
          we are covered by SEBI&apos;s investor grievance mechanisms. If your
          complaint remains unresolved, you may file it on SEBI&apos;s SCORES
          portal at{" "}
          <a
            href="https://scores.sebi.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)" }}
          >
            scores.sebi.gov.in
          </a>{" "}
          (you&apos;ll need your name, PAN, mobile number, and email to
          register), or pursue online conciliation/arbitration via the SEBI
          SMART ODR portal at{" "}
          <a
            href="https://smartodr.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)" }}
          >
            smartodr.in
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold">Records</h2>
        <p>
          We keep a record of every grievance raised and how it was resolved,
          as required of SEBI-registered Research Analysts.
        </p>

        <h2 className="text-lg font-semibold">Related</h2>
        <p>
          <a href="/legal/privacy" style={{ color: "var(--primary)" }}>
            Privacy Policy
          </a>
          {" · "}
          <a href="/legal/terms" style={{ color: "var(--primary)" }}>
            Terms of Service
          </a>
          {" · "}
          <a href="/legal/sebi-registration" style={{ color: "var(--primary)" }}>
            SEBI Registration
          </a>
        </p>
      </section>
    </article>
  );
}
