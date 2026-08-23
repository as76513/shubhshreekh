"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

const proFeatures = [
  'Unlimited daily Market Insights',
  'Unlimited MF Alerts every day',
  'All 45+ premium courses',
  'F&O Desk — Futures & Options notes',
  'Options education alerts',
  '1-on-1 Portfolio Advisory',
  'Priority WhatsApp Support',
  'Monthly Live Webinars',
  'Pre-IPO & NFO Analysis',
  'Exclusive Research Reports',
]

export default function UpgradeModal() {
  const { setShowUpgradeModal, upgradeToPro } = useAuth();
  const onClose = () => setShowUpgradeModal(false);
  const onUpgrade = upgradeToPro;
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1400))
    setLoading(false)
    onUpgrade()
  }

  const price = billing === 'monthly' ? 999 : Math.round(7999 / 12)
  const totalPrice = billing === 'monthly' ? 999 : 7999
  const saving = billing === 'yearly' ? Math.round(((999 * 12 - 7999) / (999 * 12)) * 100) : 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay-85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 relative"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-secondary"
          style={{ color: 'var(--muted-foreground)' }}
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'var(--primary-12)', border: '1px solid var(--primary-25)' }}
          >
            ✦
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>
              Upgrade to Pro
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Unlock everything. Invest smarter.
            </p>
          </div>
        </div>

        {/* Billing toggle */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl mb-5"
          style={{ background: 'var(--secondary)' }}
        >
          {(['monthly', 'yearly'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all flex items-center justify-center gap-2"
              style={{
                background: billing === b ? 'var(--card)' : 'transparent',
                color: billing === b ? 'var(--foreground)' : 'var(--muted-foreground)',
                border: billing === b ? '1px solid var(--border)' : '1px solid transparent',
              }}
            >
              {b}
              {b === 'yearly' && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(14,203,129,0.12)', color: 'var(--accent)' }}
                >
                  Save {saving}%
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Price */}
        <div className="mb-5 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-xl font-bold" style={{ color: 'var(--muted-foreground)' }}>₹</span>
            <span
              className="text-5xl font-bold"
              style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace' }}
            >
              {price.toLocaleString('en-IN')}
            </span>
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>/month</span>
          </div>
          {billing === 'yearly' && (
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              Billed as ₹{totalPrice.toLocaleString('en-IN')}/year
            </p>
          )}
        </div>

        {/* Features */}
        <div className="mb-6 space-y-2">
          {proFeatures.map(f => (
            <div key={f} className="flex items-center gap-2.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                style={{ background: 'rgba(14,203,129,0.12)', color: 'var(--accent)' }}
              >
                ✓
              </span>
              <span className="text-sm" style={{ color: 'var(--secondary-foreground)' }}>
                {f}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))',
            color: 'var(--primary-foreground)',
          }}
        >
          {loading ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current"
                style={{ animation: 'spin 0.7s linear infinite' }}
              />
              Processing...
            </>
          ) : (
            `Start Pro – ₹${totalPrice.toLocaleString('en-IN')}${billing === 'yearly' ? '/yr' : '/mo'}`
          )}
        </button>

        <p className="text-xs text-center mt-3" style={{ color: 'var(--muted-foreground)' }}>
          Cancel anytime · Secure payment via Razorpay
        </p>
      </div>
    </div>
  )
}
