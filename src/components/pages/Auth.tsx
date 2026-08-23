"use client";

import { useState, useRef } from "react";
import Logo from "@/components/Logo";
import { useAuth } from "@/lib/auth-context";

export default function Auth() {
  const { login: onLogin, navigate } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setOtpSent(true)
    setStep('otp')
    setTimeout(() => otpRefs.current[0]?.focus(), 100)
  }

  const handleOtpChange = (index: number, value: string) => {
    // Paste / autofill may deliver multiple digits into one box
    const digits = value.replace(/\D/g, '')
    if (!digits) {
      const next = [...otp]
      next[index] = ''
      setOtp(next)
      return
    }
    const next = [...otp]
    for (let i = 0; i < digits.length && index + i < 4; i++) {
      next[index + i] = digits[i]
    }
    setOtp(next)
    const focusAt = Math.min(index + digits.length, 3)
    otpRefs.current[focusAt]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpFocus = (index: number) => {
    otpRefs.current[index]?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    })
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.join('').length !== 4) {
      setError('Enter the 4-digit OTP')
      return
    }
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 1000))
    setLoading(false)
    onLogin('+91 ' + phone)
  }

  const resend = async () => {
    setOtp(['', '', '', ''])
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setLoading(false)
    otpRefs.current[0]?.focus()
  }

  return (
    <div className="min-h-dvh flex">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[46%] p-14 relative overflow-hidden"
        style={{ background: 'var(--card)' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 70% at 20% 80%, var(--primary-08) 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 80% 20%, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, var(--border) 0, var(--border) 1px, transparent 1px, transparent 52px), repeating-linear-gradient(90deg, var(--border) 0, var(--border) 1px, transparent 1px, transparent 52px)',
          }}
        />

        {/* Logo */}
        <button onClick={() => navigate('landing')} className="relative" aria-label="ShubhShree Knowledge Hub Pvt Ltd home">
          <Logo height={96} />
        </button>

        {/* Main content */}
        <div className="relative">
          <h2
            className="text-4xl font-bold leading-snug mb-8"
            style={{ fontFamily: 'DM Serif Display, serif', color: 'var(--foreground)' }}
          >
            INVEST today. <span className="hl">GROW</span> tomorrow. Let's build your financial future together.
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Active Investors', value: '50,000+' },
              { label: 'Research Ideas', value: '2,400+' },
              { label: 'Courses', value: '45+' },
              { label: 'Avg. Returns', value: '+32%' },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-xl p-4"
                style={{
                  background: 'var(--overlay-50)',
                  border: '1px solid var(--border)',
                }}
              >
                <p
                  className="text-2xl font-bold mb-0.5"
                  style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {s.value}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-6 rounded-xl p-4 flex items-start gap-3"
            style={{
              background: 'rgba(14,203,129,0.06)',
              border: '1px solid rgba(14,203,129,0.15)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-bold"
              style={{ background: 'rgba(14,203,129,0.12)', color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}
            >
              AP
            </div>
            <div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--secondary-foreground)' }}>
                "The research notes and courses made market concepts much easier to follow."
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Arjun Patel, Mumbai · Pro Member
              </p>
            </div>
          </div>
        </div>

        <p className="relative text-xs" style={{ color: 'var(--muted-foreground)' }}>
          © 2026 Shubhshree Knowledge Hub Private Limited
        </p>
      </div>

      {/* Right form panel — top-aligned on small screens so OTP stays above the keyboard */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center px-5 py-8 sm:p-8 lg:p-14 overflow-y-auto">
        <div className="w-full max-w-[22rem]">
          <button
            onClick={() => navigate('landing')}
            className="lg:hidden mb-5"
            aria-label="ShubhShree Knowledge Hub Pvt Ltd home"
          >
            <Logo height={72} />
          </button>
          <button
            onClick={() => navigate('landing')}
            className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-70"
            style={{ color: 'var(--muted-foreground)' }}
          >
            ← Back to home
          </button>

          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="fade-in">
              <div className="mb-7">
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                  Welcome to Shubhshree
                </h1>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Sign in or create an account with your mobile number
                </p>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                  Mobile Number
                </label>
                <div
                  className="flex items-center gap-0 rounded-xl overflow-hidden transition-all"
                  style={{
                    background: 'var(--secondary)',
                    border: '1px solid var(--border)',
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'}
                  onBlur={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
                >
                  <div
                    className="px-4 py-3.5 text-sm font-mono flex-shrink-0"
                    style={{
                      color: 'var(--muted-foreground)',
                      borderRight: '1px solid var(--border)',
                    }}
                  >
                    +91
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="flex-1 bg-transparent py-3.5 px-4 outline-none text-sm"
                    style={{
                      color: 'var(--foreground)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
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
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP →'
                )}
              </button>

              <p className="text-xs text-center mt-4" style={{ color: 'var(--muted-foreground)' }}>
                By continuing, you agree to our{' '}
                <span className="cursor-pointer hover:underline" style={{ color: 'var(--primary)' }}>
                  Terms of Service
                </span>{' '}
                and{' '}
                <span className="cursor-pointer hover:underline" style={{ color: 'var(--primary)' }}>
                  Privacy Policy
                </span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="fade-in">
              <div className="mb-5">
                <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                  Verify your number
                </h1>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  {otpSent ? 'OTP sent to ' : 'Enter the code sent to '}
                  <span style={{ color: 'var(--foreground)', fontFamily: 'JetBrains Mono, monospace' }}>
                    +91 {phone}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(['', '', '', '']); setError('') }}
                  className="text-xs mt-1 hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Change number
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                  Enter 4-digit OTP
                </label>
                {/* Fixed box size — native input size=20 was overflowing the row off-screen */}
                <div className="flex justify-between gap-2 sm:gap-3 max-w-[18rem] mx-auto">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { otpRefs.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      maxLength={1}
                      size={1}
                      value={digit}
                      aria-label={`OTP digit ${i + 1}`}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onFocus={e => {
                        handleOtpFocus(i)
                        e.currentTarget.style.border = '2px solid var(--primary)'
                      }}
                      onBlur={e => {
                        if (!otp[i]) {
                          e.currentTarget.style.border = '1.5px solid #6b7f9e'
                        }
                      }}
                      className="otp-digit h-14 w-12 sm:w-14 shrink-0 text-center text-xl font-bold rounded-xl outline-none transition-all"
                      style={{
                        background: '#243552',
                        border: digit
                          ? '2px solid var(--primary)'
                          : '1.5px solid #6b7f9e',
                        color: 'var(--foreground)',
                        caretColor: 'var(--primary)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  ))}
                </div>
                {error && (
                  <p className="text-xs mt-1.5 text-center" style={{ color: '#f87171' }}>
                    {error}
                  </p>
                )}
                <p className="text-xs mt-2 text-center" style={{ color: 'var(--muted-foreground)' }}>
                  Enter any 4 digits for this demo
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.join('').length < 4}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
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
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue →'
                )}
              </button>

              <p className="text-xs text-center mt-4" style={{ color: 'var(--muted-foreground)' }}>
                Didn't receive OTP?{' '}
                <button
                  type="button"
                  onClick={resend}
                  className="hover:underline"
                  style={{ color: 'var(--primary)' }}
                >
                  Resend OTP
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
