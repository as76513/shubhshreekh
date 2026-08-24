"use client";

import { useState } from 'react'
import { courses } from "@/lib/data";
import { useAuth } from "@/lib/auth-context";

interface Props {
  courseId: number;
}

export default function CourseDetail({ courseId }: Props) {
  const { user, navigate, onUpgrade } = useAuth();
  const course = courses.find(c => c.id === courseId) || courses[0]
  const isPro = user?.subscription === 'pro'
  const canAccess = !course.isPro || isPro
  const [activeChapter, setActiveChapter] = useState(0)
  const [playing, setPlaying] = useState(false)

  return (
    <div
      className="min-h-screen"
      style={{ background: 'transparent' }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center gap-3 px-4 sm:px-6 py-3"
        style={{
          background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          onClick={() => navigate('courses')}
          className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-70"
          style={{ color: 'var(--muted-foreground)' }}
        >
          ← Courses
        </button>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm truncate" style={{ color: 'var(--foreground)' }}>
          {course.title}
        </span>
        {course.isPro && (
          <span
            className="ml-auto flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-bold"
            style={{ background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))', color: '#0b2438' }}
          >
            PRO
          </span>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Video Player */}
            <div
              className="surface-card relative rounded-2xl overflow-hidden mb-6"
              style={{ aspectRatio: '16/9' }}
            >
              {canAccess ? (
                <>
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: playing ? 'transparent' : 'color-mix(in srgb, var(--surface) 55%, transparent)' }}
                  >
                    {!playing && (
                      <button
                        onClick={() => setPlaying(true)}
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all hover:scale-110"
                        style={{
                          background: 'linear-gradient(135deg, var(--gold-from), var(--gold-to))',
                          color: '#0b2438',
                        }}
                      >
                        ▶
                      </button>
                    )}
                    {playing && (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center"
                          style={{ background: 'color-mix(in srgb, var(--surface) 82%, transparent)', border: '1px solid var(--border)' }}
                        >
                          <span style={{ color: 'var(--primary)', fontSize: '20px' }}>♪</span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                          {course.chapters[activeChapter]?.title}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          Video playing — demo mode
                        </p>
                        <button
                          onClick={() => setPlaying(false)}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                        >
                          Stop
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-4"
                  onClick={onUpgrade}
                >
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                  <div className="relative text-center">
                    <div className="text-5xl mb-3">🔒</div>
                    <p className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                      Pro Course
                    </p>
                    <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
                      Upgrade to Pro to access this course
                    </p>
                    <button className="btn-pro px-6 py-2.5 rounded-xl font-semibold text-sm">
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Course info */}
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              {course.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
              >
                {course.level}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
              >
                {course.category}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                ⭐ {course.rating} · {(course.students / 1000).toFixed(1)}K students
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--secondary-foreground)' }}>
              {course.description}
            </p>

            {/* What you'll learn */}
            <div
              className="surface-card rounded-2xl p-6 mb-6"
            >
              <h2 className="font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                What you'll learn
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {course.whatYouLearn.map(item => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5"
                      style={{ background: 'rgba(14,203,129,0.1)', color: 'var(--accent)' }}
                    >
                      ✓
                    </span>
                    <span className="text-sm" style={{ color: 'var(--secondary-foreground)' }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chapters */}
            <div className="surface-card rounded-2xl overflow-hidden">
              <div
                className="px-5 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <h2 className="font-bold" style={{ color: 'var(--foreground)' }}>
                  Course Content — {course.lessons} lessons · {course.duration}
                </h2>
              </div>
              {course.chapters.map((ch, i) => {
                const chLocked = !ch.free && !canAccess
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all"
                    style={{
                      background: activeChapter === i ? 'var(--primary-05)' : 'var(--surface-secondary)',
                      borderBottom: i < course.chapters.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                    onClick={() => {
                      if (chLocked) { onUpgrade(); return }
                      setActiveChapter(i)
                      setPlaying(false)
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: activeChapter === i ? 'var(--primary-15)' : 'var(--secondary)',
                        color: activeChapter === i ? 'var(--primary)' : 'var(--muted-foreground)',
                      }}
                    >
                      {chLocked ? '🔒' : activeChapter === i ? '▶' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium"
                        style={{ color: activeChapter === i ? 'var(--primary)' : 'var(--foreground)' }}
                      >
                        {ch.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {ch.videos} videos · {ch.duration}
                      </p>
                    </div>
                    {ch.free && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{ background: 'rgba(14,203,129,0.1)', color: 'var(--accent)' }}
                      >
                        Free Preview
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="surface-card sticky top-20 rounded-2xl overflow-hidden">
              <div className="relative h-40 overflow-hidden">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--surface) 82%, transparent) 0%, transparent 50%)' }}
                />
              </div>

              <div className="p-5">
                <div className="mb-5">
                  {course.isPro ? (
                    <p className="text-2xl font-bold" style={{ color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      ✦ Pro
                    </p>
                  ) : (
                    <p className="text-2xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                      Free
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {course.isPro ? 'Included in Pro subscription' : 'Available for all users'}
                  </p>
                </div>

                {canAccess ? (
                  <button
                    onClick={() => setPlaying(true)}
                    className="btn-pro w-full py-3 rounded-xl font-semibold text-sm mb-3"
                  >
                    ▶ Start Learning
                  </button>
                ) : (
                  <button
                    onClick={onUpgrade}
                    className="btn-pro w-full py-3 rounded-xl font-semibold text-sm mb-3"
                  >
                    ✦ Upgrade to Access
                  </button>
                )}

                <div className="space-y-2.5">
                  {[
                    { icon: '📚', label: `${course.lessons} lessons`, sub: course.duration },
                    { icon: '📊', label: course.level, sub: 'Difficulty' },
                    { icon: '🎓', label: course.instructor, sub: course.instructorRole },
                    { icon: '👥', label: `${(course.students / 1000).toFixed(1)}K students`, sub: 'Enrolled' },
                    { icon: '⭐', label: `${course.rating} / 5`, sub: 'Rating' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-base">{item.icon}</span>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                          {item.label}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {item.sub}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Related courses */}
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted-foreground)' }}>
                Related Courses
              </p>
              <div className="space-y-3">
                {courses.filter(c => c.id !== course.id && c.category === course.category).slice(0, 2).map(c => (
                  <div
                    key={c.id}
                    className="flex gap-3 cursor-pointer group"
                    onClick={() => navigate('course-detail', c.id)}
                  >
                    <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
                      <img
                        src={c.thumbnail}
                        alt={c.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold line-clamp-2 mb-1 group-hover:text-primary transition-colors" style={{ color: 'var(--foreground)' }}>
                        {c.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {c.lessons} lessons
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
