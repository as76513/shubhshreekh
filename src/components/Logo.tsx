"use client";

interface Props {
  height?: number;
  className?: string;
  /** Show company name beside the mark (for site header) */
  withName?: boolean;
}

export default function Logo({
  height = 44,
  className = "",
  withName = false,
}: Props) {
  return (
    <span
      className={`inline-flex items-center gap-3 ${className}`}
      style={{
        background: "var(--logo-plate)",
        padding: "var(--logo-pad)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/logo.png"
        alt={
          withName
            ? ""
            : "ShubhShree Knowledge Hub Pvt Ltd"
        }
        className="block object-contain rounded-lg"
        style={{ height, width: "auto", aspectRatio: "1 / 1" }}
      />
      {withName && (
        <span className="flex flex-col items-start text-left leading-tight min-w-0">
          <span
            className="text-lg sm:text-xl font-bold tracking-wide truncate"
            style={{
              background: "var(--gold-from)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "var(--gold)",
            }}
          >
            ShubhShree
          </span>
          <span
            className="text-[10px] sm:text-xs font-medium tracking-wide truncate"
            style={{ color: "var(--muted-foreground)" }}
          >
            Knowledge Hub Pvt Ltd
          </span>
        </span>
      )}
    </span>
  );
}
