"use client";

import { useState } from "react";
import type { AppView } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";

const navLinks: { label: string; view: AppView }[] = [
  { label: 'Market Insights', view: 'trading' },
  { label: 'MF Alerts', view: 'mf-alerts' },
  { label: 'Courses', view: 'courses' },
  { label: 'Videos', view: 'videos' },
]

export default function Navbar() {
  const { user, currentView: view, navigate, logout, onUpgrade } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false)

  const close = () => setMenuOpen(false)

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(14px)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[76px]">
          {/* Brand header */}
          <button
            type="button"
            onClick={() => navigate(user ? 'dashboard' : 'landing')}
            className="flex items-center flex-shrink-0 min-w-0 bg-transparent border-0 p-0 cursor-pointer"
            aria-label="ShubhShree Knowledge Hub Pvt Ltd — home"
          >
            <Logo height={48} withName />
          </button>

          {/* Desktop nav links (only when logged in) */}
          {user && (
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <button
                  key={link.view}
                  onClick={() => navigate(link.view)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: view === link.view ? 'var(--primary-12)' : 'transparent',
                    color: view === link.view ? 'var(--primary)' : 'var(--secondary-foreground)',
                    borderColor: view === link.view ? 'var(--primary-20)' : 'transparent',
                    border: '1px solid',
                  }}
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}

          {/* Right */}
          <div className="flex items-center gap-3 relative">
            {user ? (
              <>
                {user.subscription === 'free' && (
                  <button
                    onClick={onUpgrade}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105"
                    style={{
                      background: 'var(--primary-10)',
                      border: '1px solid var(--primary-35)',
                      color: 'var(--primary)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--primary)', animation: 'pulse 2s infinite' }}
                    />
                    Upgrade to Pro
                  </button>
                )}
                {user.subscription === 'pro' && (
                  <span
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                    style={{
                      background: 'var(--primary-08)',
                      border: '1px solid var(--primary-20)',
                      color: 'var(--primary)',
                    }}
                  >
                    ✦ Pro Member
                  </span>
                )}
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-105"
                  style={{
                    background: 'var(--secondary)',
                    border: menuOpen ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                    color: 'var(--primary)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>

                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={close}
                    />
                    <div
                      className="absolute top-12 right-0 w-52 rounded-2xl shadow-2xl p-2 z-50"
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="px-3 py-2.5 mb-1" style={{ borderBottom: '1px solid var(--border)' }}>
                        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                          {user.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {user.phone}
                        </p>
                        <span
                          className="inline-flex items-center mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: user.subscription === 'pro' ? 'var(--primary-12)' : 'rgba(96,112,153,0.15)',
                            color: user.subscription === 'pro' ? 'var(--primary)' : 'var(--muted-foreground)',
                          }}
                        >
                          {user.subscription === 'pro' ? '✦ Pro' : 'Free Plan'}
                        </span>
                      </div>
                      {navLinks.map(link => (
                        <button
                          key={link.view}
                          onClick={() => { navigate(link.view); close() }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-secondary"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {link.label}
                        </button>
                      ))}
                      <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                        {user.subscription === 'free' && (
                          <button
                            onClick={() => { onUpgrade(); close() }}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-secondary"
                            style={{ color: 'var(--primary)' }}
                          >
                            ✦ Upgrade to Pro
                          </button>
                        )}
                        <button
                          onClick={() => { logout(); close() }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all hover:bg-secondary"
                          style={{ color: '#f87171' }}
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => navigate('login')}
                  className="px-2.5 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                  style={{ color: 'var(--secondary-foreground)' }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('login')}
                  className="px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90 whitespace-nowrap"
                  style={{
                    background: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                  }}
                >
                  <span className="sm:hidden">Get Started</span>
                  <span className="hidden sm:inline">Get Started Free</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile nav links */}
      {user && (
        <div
          className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          {navLinks.map(link => (
            <button
              key={link.view}
              onClick={() => navigate(link.view)}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: view === link.view ? 'var(--primary-12)' : 'transparent',
                color: view === link.view ? 'var(--primary)' : 'var(--muted-foreground)',
                border: '1px solid',
                borderColor: view === link.view ? 'var(--primary-20)' : 'transparent',
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
