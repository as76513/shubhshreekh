"use client";

interface Props {
  height?: number;
  className?: string;
}

export default function Logo({ height = 44, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl ${className}`}
      style={{
        background: "var(--logo-plate)",
        padding: "var(--logo-pad)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/logo.png"
        alt="SHUBH SHREE"
        className="block object-contain"
        style={{ height, width: "auto" }}
      />
    </span>
  );
}
