"use client";

import type { AppView } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";

export default function Footer() {
  const { navigate } = useAuth();
  return (
    <footer
      className="mt-20 border-t"
      style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <Logo height={72} withName />
            </div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--muted-foreground)' }}>
              Helping 50,000+ retail investors in India with research notes, mutual fund explainers, and financial education.
            </p>
            <div className="flex items-center gap-3">
              {['𝕏', 'in', 'yt', 'tg'].map(s => (
                <div
                  key={s}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer transition-all hover:scale-110"
                  style={{
                    background: 'var(--secondary)',
                    color: 'var(--secondary-foreground)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Services */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Services
            </p>
            <ul className="space-y-2.5">
              {[
                { label: 'Market Insights', view: 'trading' as AppView },
                { label: 'Courses', view: 'courses' as AppView },
                { label: 'Video Tutorials', view: 'videos' as AppView },
                { label: 'Pro Membership', view: 'landing' as AppView },
              ].map(item => (
                <li key={item.label}>
                  <button
                    onClick={() => navigate(item.view)}
                    className="text-sm transition-colors hover:text-primary"
                    style={{ color: 'var(--secondary-foreground)' }}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Legal
            </p>
            <ul className="space-y-2.5">
              {['Terms of Service', 'Privacy Policy', 'Refund Policy', 'Disclaimer', 'SEBI Registration'].map(item => (
                <li key={item}>
                  <span
                    className="text-sm cursor-pointer transition-colors hover:text-primary"
                    style={{ color: 'var(--secondary-foreground)' }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--muted-foreground)' }}>
              Contact
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <span className="text-base mt-0.5">📧</span>
                <span className="text-sm" style={{ color: 'var(--secondary-foreground)' }}>
                  support@shubhshree.in
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-base mt-0.5">📞</span>
                <span className="text-sm" style={{ color: 'var(--secondary-foreground)' }}>
                  +91 98765 43210
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-base mt-0.5">🏢</span>
                <span className="text-sm" style={{ color: 'var(--secondary-foreground)' }}>
                  Shubhshree Knowledge Hub Pvt. Ltd.<br />
                  Mumbai, Maharashtra – 400001
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div
          className="rounded-xl p-4 mb-8 text-xs leading-relaxed"
          style={{
            background: 'var(--secondary)',
            color: 'var(--muted-foreground)',
            border: '1px solid var(--border)',
          }}
        >
          <span className="font-semibold" style={{ color: 'var(--foreground)' }}>Disclaimer: </span>
          Investments in securities market are subject to market risks. Read all related documents carefully before investing. Past performance is not indicative of future returns. Shubhshree Knowledge Hub Pvt. Ltd. is not a SEBI registered investment advisor. Market insights are for educational and informational purposes only and should not be construed as investment advice.
        </div>

        {/* Bottom */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            © 2026 Shubhshree Knowledge Hub Private Limited. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            CIN: U74999MH2024PTC000000 · GST: 27XXXXX0000X1Z0
          </p>
        </div>
      </div>
    </footer>
  )
}
