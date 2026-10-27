"use client";

interface Props {
  height?: number;
  className?: string;
  /** Show the wordmark beside the mark. */
  withName?: boolean;
  /** Gold wordmark for navy panels. Ink wordmark on light surfaces. */
  onDark?: boolean;
}

export default function Logo({
  height = 44,
  className = "",
  withName = false,
  onDark = false,
}: Props) {
  const title = Math.max(16, Math.round(height * 0.46));
  const line = Math.max(12, Math.round(height * 0.3));

  return (
    <span
      className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}
      style={{
        background: "var(--logo-plate)",
        padding: "var(--logo-pad)",
      }}
    >
      <span
        className="relative inline-flex shrink-0 items-center justify-center overflow-hidden"
        style={{ height, width: height }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/logo.png?v=original"
          alt={withName ? "" : "ShubhShree Knowledge Hub"}
          className="block h-full w-full object-contain object-center"
        />
      </span>
      {withName && (
        <span className="flex flex-col items-start text-left leading-none min-w-0">
          <span
            className="font-bold tracking-tight truncate"
            style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: title,
              color: onDark ? "#f6e7b4" : "var(--foreground)",
            }}
          >
            ShubhShree
          </span>
          <span
            className="font-semibold tracking-[0.06em] truncate"
            style={{
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: line,
              marginTop: Math.max(2, Math.round(height * 0.06)),
              color: onDark ? "#e8b84a" : "#9a6b12",
            }}
          >
            Knowledge Hub
          </span>
        </span>
      )}
    </span>
  );
}
