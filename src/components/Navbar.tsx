"use client";

import { useState } from "react";
import type { AppView } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";

const navLinks: { label: string; view: AppView }[] = [
  { label: 'Insights', view: 'trading' },
  { label: 'Blogs', view: 'blogs' },
  { label: 'Courses', view: 'courses' },
  { label: 'Videos', view: 'videos' },
]

export default function Navbar() {
  const { user, currentView: view, navigate, logout, onUpgrade } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false)

  const close = () => setMenuOpen(false)

  const canWrite = user?.role === 'analyst' || user?.role === 'admin'
  const links = canWrite ? [...navLinks, { label: 'Admin', view: 'admin' as AppView }] : navLinks

  return (
    <header
      className="glass-nav sticky top-0 z-50"
      style={{
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <button
            type="button"
            onClick={() => navigate(user ? 'dashboard' : 'landing')}
            className="flex items-center flex-shrink-0 min-w-0 bg-transparent border-0 p-0 cursor-pointer"
            aria-label="ShubhShree Knowledge Hub — home"
          >
            <Logo height={36} withName />
          </button>

          {user && (
            <nav className="hidden md:flex items-center gap-0.5" aria-label="Primary">
              {links.map(link => (
                <button
                  key={link.view}
                  onClick={() => navigate(link.view)}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: view === link.view ? 'var(--secondary)' : 'transparent',
                    color: view === link.view ? 'var(--foreground)' : 'var(--muted-foreground)',
                    fontWeight: view === link.view ? 600 : 500,
                  }}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2 relative">
            {user ? (
              <>
                {user.subscription === 'free' && (
                  <button
                    onClick={onUpgrade}
                    className="hidden sm:flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold btn-pro"
                  >
                    Upgrade
                  </button>
                )}
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-transform active:scale-95"
                  style={{
                    background: 'var(--card)',
                    color: '#ffffff',
                    border: menuOpen || user.subscription === 'pro'
                      ? '2px solid var(--gold)'
                      : '2px solid color-mix(in srgb, var(--card) 80%, #ffffff)',
                    boxShadow: 'var(--shadow-sm)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  aria-expanded={menuOpen}
                  aria-label="Account menu"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={close} aria-hidden />
                    <div
                      className="absolute top-11 right-0 w-56 rounded-2xl p-2 z-50 fade-in"
                      style={{
                        background: 'linear-gradient(165deg, #e8eef5 0%, #dbe4ee 55%, #d1dce8 100%)',
                        border: '1px solid color-mix(in srgb, #0b2438 12%, transparent)',
                        boxShadow: 'var(--shadow-lg)',
                      }}
                      role="menu"
                    >
                      <div
                        className="px-3 py-2.5 mb-1"
                        style={{ borderBottom: '1px solid color-mix(in srgb, #0b2438 10%, transparent)' }}
                      >
                        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                          {user.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {user.phone}
                        </p>
                        <span
                          className="inline-flex mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
                          style={{
                            background: user.subscription === 'pro'
                              ? 'color-mix(in srgb, var(--gold) 18%, #ffffff)'
                              : 'rgba(255,255,255,0.55)',
                            color: user.subscription === 'pro' ? 'var(--gold)' : 'var(--muted-foreground)',
                            border: user.subscription === 'pro'
                              ? '1px solid color-mix(in srgb, var(--gold) 40%, transparent)'
                              : '1px solid color-mix(in srgb, #0b2438 8%, transparent)',
                          }}
                        >
                          {user.subscription === 'pro' ? 'Pro' : 'Free'}
                        </span>
                      </div>
                      {links.map(link => (
                        <button
                          key={link.view}
                          role="menuitem"
                          onClick={() => { navigate(link.view); close() }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors"
                          style={{ color: 'var(--foreground)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                        >
                          {link.label}
                        </button>
                      ))}
                      <div
                        className="mt-1 pt-1"
                        style={{ borderTop: '1px solid color-mix(in srgb, #0b2438 10%, transparent)' }}
                      >
                        {user.subscription === 'free' && (
                          <button
                            role="menuitem"
                            onClick={() => { onUpgrade(); close() }}
                            className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold"
                            style={{ color: 'var(--gold)' }}
                          >
                            Upgrade to Pro
                          </button>
                        )}
                        <button
                          role="menuitem"
                          onClick={() => { logout(); close() }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-sm"
                          style={{ color: 'var(--destructive)' }}
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => navigate('login')}
                  className="px-3 py-2 rounded-full text-sm font-medium"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('login')}
                  className="btn-action px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  Get started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {user && (
        <div
          className="md:hidden flex items-center gap-1 px-4 pb-2.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {links.map(link => (
            <button
              key={link.view}
              onClick={() => navigate(link.view)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: view === link.view ? 'var(--foreground)' : 'var(--secondary)',
                color: view === link.view ? '#ffffff' : 'var(--muted-foreground)',
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}
