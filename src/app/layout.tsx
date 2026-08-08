import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShubhShreekh — Smarter Market Insights",
  description:
    "Clear buy, sell & hold signals for Indian markets — research-backed trade ideas from a SEBI-registered Research Analyst.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
