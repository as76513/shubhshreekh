import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — ShubhShreekh",
  description: "How ShubhShreekh collects and uses personal information.",
};

export default function PrivacyPage() {
  return (
    <article className="space-y-6" style={{ color: "var(--foreground)" }}>
      <h1
        className="text-3xl font-bold"
        style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
      >
        Privacy Policy
      </h1>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        Last updated: 8 October 2026 · Placeholder for Play Store / launch —
        replace with counsel-approved text before charging users.
      </p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">Who we are</h2>
        <p>
          Shubhshree Knowledge Hub Private Limited (“ShubhShreekh”) provides
          research notes and financial education via our web and Android app at
          app.shubhshreeknowledgehub.com. SEBI Research Analyst Registration
          No.: [PENDING — insert once allotted/confirmed]. BASL Membership
          No.: [PENDING].
        </p>

        <h2 className="text-lg font-semibold">Data we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Mobile number (for OTP login)</li>
          <li>Subscription / plan status</li>
          <li>Device and usage data needed to run the app (e.g. crash logs)</li>
          <li>Payment references from our payment partners (not full card/UPI secrets)</li>
        </ul>

        <h2 className="text-lg font-semibold">How we use data</h2>
        <p>
          To authenticate you, deliver subscribed content, improve the product,
          meet SEBI / legal record-keeping duties, and communicate service
          updates.
        </p>

        <h2 className="text-lg font-semibold">Sharing</h2>
        <p>
          We use processors such as cloud hosting (AWS), SMS OTP (MSG91), and
          payment providers (PayU / Google Play Billing where applicable). We do
          not sell your personal data.
        </p>

        <h2 className="text-lg font-semibold">Contact</h2>
        <p>
          Privacy questions: email support@shubhshree.in, or see the{" "}
          <a href="/legal/grievance" style={{ color: "var(--primary)" }}>
            grievance
          </a>{" "}
          page for the escalation path.
        </p>
      </section>
    </article>
  );
}
