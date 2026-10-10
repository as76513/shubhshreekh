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
        Last updated: 8 October 2026 · Placeholder — confirm officer name,
        email, and escalation with your SEBI compliance advisor.
      </p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">How to raise a complaint</h2>
        <p>
          Email support@shubhshree.in with your registered mobile number, a
          short description of the issue, and any screenshots. We aim to
          acknowledge within a few business days.
        </p>

        <h2 className="text-lg font-semibold">Escalation</h2>
        <p>
          If unresolved, escalate to our designated Grievance Officer:{" "}
          <strong>[PENDING — officer name]</strong>,{" "}
          <strong>[PENDING — direct email]</strong>. SEBI / SCORES avenues
          (scores.sebi.gov.in) may also apply for Research Analyst services as
          per regulation — SEBI Research Analyst Registration No.: [PENDING].
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
        </p>
      </section>
    </article>
  );
}
