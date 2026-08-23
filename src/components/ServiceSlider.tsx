"use client";

import { useEffect, useState } from "react";
import type { AppView } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

type Slide = {
  view: AppView
  kicker: string
  title: string
  desc: string
  image: string
}

const slides: Slide[] = [
  {
    view: 'trading' as AppView,
    kicker: 'Market Insights',
    title: 'Research ideas on listed stocks',
    desc: 'Educational setups with entry, target and stop loss. For study, not execution advice.',
    image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&h=900&fit=crop&auto=format',
  },
  {
    view: 'mf-alerts' as AppView,
    kicker: 'MF Alerts',
    title: 'Mutual fund watchlist, explained',
    desc: 'SIP, switch, and hold notes on popular fund categories — large cap to index funds.',
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=1600&h=900&fit=crop&auto=format',
  },
  {
    view: 'courses' as AppView,
    kicker: 'Courses',
    title: 'Market lessons, built for India',
    desc: 'Short modules on personal finance, options basics, and reading charts — at your pace.',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&h=900&fit=crop&auto=format',
  },
  {
    view: 'trading' as AppView,
    kicker: 'Market Insights',
    title: 'Index desk: Nifty, Sensex, Bank Nifty',
    desc: 'Context on index moves and sector maps. Past figures are illustrative only.',
    image: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=1600&h=900&fit=crop&auto=format',
  },
  {
    view: 'dashboard' as AppView,
    kicker: 'Portfolio',
    title: 'Portfolio management, in one view',
    desc: 'Track allocation across equity, debt, and SIPs. Figures here are sample data for learning.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1600&h=900&fit=crop&auto=format',
  },
  {
    view: 'courses' as AppView,
    kicker: 'Live Courses',
    title: 'Online live courses by a SEBI-registered RA',
    desc: 'Live classroom sessions on markets and funds, led by a SEBI-registered Research Analyst.',
    image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&h=900&fit=crop&auto=format',
  },
]

function slotOf(index: number, active: number, count: number) {
  let slot = index - active
  if (slot > count / 2) slot -= count
  if (slot < -count / 2) slot += count
  return slot
}

function slotName(slot: number) {
  if (slot === 0) return 'front'
  if (slot === -1) return 'prev'
  if (slot === 1) return 'next'
  return 'back'
}

export default function ServiceSlider() {
  const { navigate, user } = useAuth();
  const [active, setActive] = useState(0)
  const count = slides.length

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive(i => (i + 1) % count)
    }, 3400)
    return () => window.clearInterval(timer)
  }, [count])

  const openSlide = (index: number, view: AppView) => {
    if (index !== active) {
      setActive(index)
      return
    }
    navigate(user ? view : 'login')
  }

  return (
    <div className="service-orbit">
      <div className="orbit-stage">
        {slides.map((slide, index) => {
          const name = slotName(slotOf(index, active, count))
          return (
            <div
              key={slide.title}
              className={`orbit-item is-${name}${name === 'front' ? ' is-front' : ''}${name === 'back' ? ' is-back' : ''}`}
            >
              <button
                type="button"
                onClick={() => openSlide(index, slide.view)}
                className="service-card"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.image} alt="" className="service-card-img" />
                <span className="service-card-shade" aria-hidden="true" />
                <span className="service-card-copy">
                  <span className="service-card-kicker">{slide.kicker}</span>
                  <span className="service-card-title">{slide.title}</span>
                  <span className="service-card-desc">{slide.desc}</span>
                  <span className="service-card-cta">
                    {user ? 'Open desk →' : 'Sign in to view →'}
                  </span>
                </span>
              </button>
            </div>
          )
        })}
      </div>

      <div className="orbit-dots">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`Show ${slide.title}`}
            className={`orbit-dot${index === active ? ' is-active' : ''}`}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  )
}
