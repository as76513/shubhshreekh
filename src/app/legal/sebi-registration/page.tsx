import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SEBI Registration — ShubhShreekh",
  description: "ShubhShreekh's SEBI Research Analyst registration details.",
};

export default function SebiRegistrationPage() {
  return (
    <article className="space-y-6" style={{ color: "var(--foreground)" }}>
      <h1
        className="text-3xl font-bold"
        style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
      >
        SEBI Registration
      </h1>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Last updated: 12 October 2026 · Placeholder — insert real registration
        details once allotted/confirmed by SEBI/BASL.
      </p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Registered entity</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Legal name: Shubhshree Knowledge Hub Private Limited</li>
          <li>Category: SEBI Research Analyst (Non-Individual)</li>
          <li>SEBI Research Analyst Registration No.: [PENDING]</li>
          <li>BASL Membership No.: [PENDING]</li>
          <li>Compliance Officer: [PENDING — name, email, phone]</li>
          <li>
            Registered office: Unit No 206, S.No 28.2428.22, Capella, Nr
            Chintaman, Ambegaon BK, Haveli, Pune – 411046, Maharashtra
          </li>
        </ul>

        <h2 className="text-lg font-semibold">What this registration means</h2>
        <p>
          SEBI registration lets us publish research and trading calls for
          Indian investors under the SEBI (Research Analysts) Regulations,
          2014. It does not make us an investment adviser, broker, or
          portfolio manager, and it does not guarantee the performance of our
          recommendations — see our{" "}
          <a href="/legal/disclaimer" style={{ color: "var(--primary)" }}>
            Disclaimer
          </a>
          .
        </p>

        <h2 className="text-lg font-semibold">How to verify</h2>
        <p>
          You can verify any SEBI-registered intermediary, including Research
          Analysts, on SEBI&apos;s official website at{" "}
          <a
            href="https://www.sebi.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)" }}
          >
            sebi.gov.in
          </a>{" "}
          under “Intermediaries / Market Infrastructure Institutions”, and BASL
          membership on BASL&apos;s official website. We will publish our
          registration number here as soon as it is confirmed.
        </p>

        <h2 className="text-lg font-semibold">Related</h2>
        <p>
          <a href="/legal/disclaimer" style={{ color: "var(--primary)" }}>
            Disclaimer
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
