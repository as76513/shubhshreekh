"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useAuth } from "@/lib/auth-context";

const BALLOON_COLORS = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"];
const CONFETTI_COLORS = [
  "#f43f5e", "#f59e0b", "#eab308", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#22d3ee",
];

const AUTO_DISMISS_MS = 6000;

export default function ProCelebration() {
  const { showProCelebration, dismissProCelebration } = useAuth();

  // Randomized once per showing, not on every render.
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    if (showProCelebration) setSeed((s) => s + 1);
  }, [showProCelebration]);

  const balloons = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        left: 4 + i * 10.5 + (Math.random() * 5 - 2.5),
        delay: Math.random() * 1.4,
        duration: 5 + Math.random() * 2.2,
        color: BALLOON_COLORS[i % BALLOON_COLORS.length],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed],
  );

  const confetti = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        duration: 2.6 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.round(Math.random() * 360),
        drift: Math.round((Math.random() - 0.5) * 220),
        size: 6 + Math.random() * 6,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed],
  );

  useEffect(() => {
    if (!showProCelebration) return;
    const t = setTimeout(dismissProCelebration, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [showProCelebration, dismissProCelebration]);

  if (!showProCelebration) return null;

  return (
    <div className="fixed inset-0 z-[120] overflow-hidden" role="status" aria-live="polite">
      <div
        className="absolute inset-0"
        style={{
          background: "color-mix(in srgb, #0b2438 45%, transparent)",
          backdropFilter: "blur(4px)",
        }}
        onClick={dismissProCelebration}
      />

      <div className="pointer-events-none absolute inset-0">
        {balloons.map((b, i) => (
          <div
            key={i}
            className="balloon-rise absolute bottom-[-140px]"
            style={{
              left: `${b.left}%`,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
            }}
          >
            <div
              className="h-12 w-10 rounded-[50%/58%]"
              style={{
                background: b.color,
                boxShadow: "inset -6px -6px 10px rgba(0,0,0,0.15)",
              }}
            />
            <div className="mx-auto h-10 w-px" style={{ background: "rgba(255,255,255,0.5)" }} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="confetti-fall absolute"
            style={
              {
                left: `${c.left}%`,
                top: "-20px",
                width: `${c.size}px`,
                height: `${c.size * 0.4}px`,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                "--drift": `${c.drift}px`,
                "--rotate": `${c.rotate}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full items-center justify-center p-4">
        <div
          className="fade-in w-full max-w-sm rounded-2xl p-8 text-center"
          style={{
            background: "var(--surface)",
            border: "1px solid color-mix(in srgb, var(--gold) 40%, var(--border))",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="mb-3 text-5xl">🎉</div>
          <h2
            className="mb-2 text-2xl font-bold"
            style={{ color: "var(--foreground)", fontFamily: "DM Serif Display, serif" }}
          >
            Congratulations!
          </h2>
          <p className="mb-6 text-sm" style={{ color: "var(--muted-foreground)" }}>
            You&apos;re now a{" "}
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>Pro</span> member.
            Unlimited insights and courses are all yours.
          </p>
          <button
            onClick={dismissProCelebration}
            className="btn-pro w-full rounded-xl py-3 text-sm font-semibold"
          >
            Let&apos;s go →
          </button>
        </div>
      </div>
    </div>
  );
}
