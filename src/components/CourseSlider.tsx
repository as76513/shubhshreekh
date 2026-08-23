"use client";

import { useEffect, useState } from "react";
import { courses } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

interface Props {
  items?: typeof courses;
}

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

export default function CourseSlider({ items }: Props) {
  const { navigate, user } = useAuth();
  const list = items ?? courses
  const [active, setActive] = useState(0)
  const count = list.length

  useEffect(() => {
    setActive(0)
  }, [count])

  useEffect(() => {
    if (count === 0) return
    const timer = window.setInterval(() => {
      setActive(i => (i + 1) % count)
    }, 3400)
    return () => window.clearInterval(timer)
  }, [count])

  if (count === 0) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
        No courses in this filter.
      </p>
    )
  }

  const openSlide = (index: number, courseId: number) => {
    if (index !== active) {
      setActive(index)
      return
    }
    if (!user) {
      navigate('login')
      return
    }
    navigate('course-detail', courseId)
  }

  return (
    <div className="service-orbit">
      <div className="orbit-stage">
        {list.map((course, index) => {
          const name = slotName(slotOf(index, active, count))
          return (
            <div
              key={course.id}
              className={`orbit-item is-${name}${name === 'front' ? ' is-front' : ''}${name === 'back' ? ' is-back' : ''}`}
            >
              <button
                type="button"
                onClick={() => openSlide(index, course.id)}
                className="service-card"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={course.thumbnail} alt="" className="service-card-img" />
                <span className="service-card-shade" aria-hidden="true" />
                <span className="service-card-copy">
                  <span className="service-card-kicker">{course.category}</span>
                  <span className="service-card-title">{course.title}</span>
                  <span className="service-card-desc">
                    {course.lessons} lessons · {course.duration} · {course.level}
                    {course.isPro ? ' · Pro' : ''}
                  </span>
                  <span className="service-card-cta">
                    {user ? 'Open course →' : 'Sign in to view →'}
                  </span>
                </span>
              </button>
            </div>
          )
        })}
      </div>

      <div className="orbit-dots">
        {list.map((course, index) => (
          <button
            key={course.id}
            type="button"
            aria-label={`Show ${course.title}`}
            className={`orbit-dot${index === active ? ' is-active' : ''}`}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  )
}
