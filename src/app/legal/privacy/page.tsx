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
        Last updated: 12 October 2026 · Placeholder for Play Store / launch —
        replace with counsel-approved text before charging users.
      </p>

      <section className="space-y-3 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold">1. Who we are</h2>
        <p>
          Shubhshree Knowledge Hub Private Limited (“ShubhShreekh”, “we”,
          “us”) provides research notes and financial education via our web
          and Android app at app.shubhshreeknowledgehub.com. SEBI Research
          Analyst Registration No.: [PENDING — insert once
          allotted/confirmed]. BASL Membership No.: [PENDING]. By using the
          app you consent to the practices described in this policy.
        </p>

        <h2 className="text-lg font-semibold">2. Information we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Mobile number (for OTP login) and, if you add them, your name and email</li>
          <li>Subscription / plan status and trial dates</li>
          <li>A device identifier and device label you (or your browser) supply, used only to enforce the 2-device login limit</li>
          <li>Device and usage data needed to run the app (e.g. crash logs)</li>
          <li>Payment references from our payment partners — not your full card/UPI details, which we never see or store</li>
        </ul>
        <p>
          We do not use tracking cookies. The app keeps your session token in
          your browser/device&apos;s local storage so you stay logged in.
        </p>

        <h2 className="text-lg font-semibold">3. How we use your data</h2>
        <p>
          To authenticate you, run the 2-device anti-piracy check, deliver the
          content your subscription entitles you to, process payments,
          prevent fraud and abuse, meet SEBI / legal record-keeping duties
          (including logging which published insight a user viewed, and
          when), improve the product, and send you service-related messages.
        </p>

        <h2 className="text-lg font-semibold">4. Sharing of information</h2>
        <p>
          We share data only with service providers who help us run the app,
          under confidentiality obligations: cloud hosting (AWS, India
          region), SMS OTP delivery (MSG91), and payment processing (PayU /
          Google Play Billing, where applicable). We may also disclose data
          where required by law, regulation, or a valid SEBI / court / law
          enforcement request. We do not sell your personal data.
        </p>

        <h2 className="text-lg font-semibold">5. Data retention</h2>
        <p>
          We retain account and subscription data for as long as your account
          is active, and content-viewing records for as long as SEBI
          record-keeping norms require. We may retain limited data after
          account closure where needed to meet legal, tax, or regulatory
          obligations.
        </p>

        <h2 className="text-lg font-semibold">6. Your rights</h2>
        <p>
          You may ask us to access, correct, or delete your personal data by
          emailing contact@shubhshreeknowledgehub.com. We will honour requests
          to the extent consistent with our legal and SEBI record-keeping
          obligations, and may need to verify your identity first.
        </p>

        <h2 className="text-lg font-semibold">7. Security</h2>
        <p>
          We use industry-standard safeguards (encrypted transport, access
          controls on our systems) to protect your data, but no method of
          transmission or storage is 100% secure. Keep your OTP and device
          secure — never share an OTP with anyone, including someone claiming
          to be from ShubhShreekh.
        </p>

        <h2 className="text-lg font-semibold">8. Children&apos;s privacy</h2>
        <p>
          The service is intended for users 18 years and older and is not
          directed at children. We do not knowingly collect personal data
          from anyone under 18.
        </p>

        <h2 className="text-lg font-semibold">9. Changes to this policy</h2>
        <p>
          We may update this policy from time to time; the “Last updated”
          date above will change accordingly. Material changes will be
          highlighted in the app.
        </p>

        <h2 className="text-lg font-semibold">10. Contact &amp; grievance officer</h2>
        <p>
          Privacy questions: email contact@shubhshreeknowledgehub.com, or see
          the{" "}
          <a href="/legal/grievance" style={{ color: "var(--primary)" }}>
            grievance
          </a>{" "}
          page for the escalation path and our Grievance Officer&apos;s
          details.
        </p>
      </section>
    </article>
  );
}
