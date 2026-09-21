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
      style={{
        background: 'color-mix(in srgb, #0b2438 55%, transparent)',
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 relative fade-in"
        style={{
          background: 'var(--surface)',
          border: '1px solid color-mix(in srgb, var(--gold) 35%, var(--border))',
          boxShadow: 'var(--shadow-lg), 0 0 0 1px color-mix(in srgb, var(--gold) 12%, transparent)',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-labelledby="upgrade-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ color: 'var(--muted-foreground)', background: 'var(--surface-secondary)' }}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))',
              color: '#0b2438',
            }}
          >
            ✦
          </div>
          <div>
            <h2
              id="upgrade-title"
              className="text-lg font-bold"
              style={{ color: 'var(--foreground)' }}
            >
              Upgrade to Pro
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Unlock everything. Invest smarter.
            </p>
          </div>
        </div>

        {/* iOS-style segment on light surface */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl mb-5"
          style={{ background: 'var(--secondary)' }}
          role="tablist"
        >
          {(['monthly', 'yearly'] as const).map(b => (
            <button
              key={b}
              role="tab"
              aria-selected={billing === b}
              onClick={() => setBilling(b)}
              className="flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all flex items-center justify-center gap-2"
              style={{
                background: billing === b ? 'var(--surface)' : 'transparent',
                color: billing === b ? 'var(--foreground)' : 'var(--muted-foreground)',
                boxShadow: billing === b ? 'var(--shadow-sm)' : 'none',
                fontWeight: billing === b ? 600 : 500,
              }}
            >
              {b}
              {b === 'yearly' && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{
                    background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                    color: 'var(--accent)',
                  }}
                >
                  Save {saving}%
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="mb-5 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-xl font-bold" style={{ color: 'var(--muted-foreground)' }}>₹</span>
            <span
              className="text-5xl font-bold"
              style={{ color: 'var(--gold)', fontFamily: 'JetBrains Mono, monospace' }}
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

        <div
          className="mb-6 space-y-2.5 max-h-[40vh] overflow-y-auto pr-1"
          style={{ scrollbarWidth: 'thin' }}
        >
          {proFeatures.map(f => (
            <div key={f} className="flex items-center gap-2.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 font-bold"
                style={{
                  background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                  color: 'var(--accent)',
                }}
              >
                ✓
              </span>
              <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                {f}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="btn-pro w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
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
          Cancel anytime · Secure payment via PayU
        </p>
      </div>
    </div>
  )
}
