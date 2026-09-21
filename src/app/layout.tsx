import type { Metadata, Viewport } from "next";
import { Outfit, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import PwaRegistrar from "@/components/PwaRegistrar";
import SiteShell from "@/components/SiteShell";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "ShubhShreekh — Invest today. Grow tomorrow.",
  description:
    "Research notes, mutual fund explainers, and financial education for Indian investors.",
  applicationName: "ShubhShreekh",
  appleWebApp: {
    capable: true,
    title: "ShubhShreekh",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2438",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${outfit.variable} ${dmSerif.variable} ${jetbrains.variable}`}
    >
      <body
        className="min-h-screen antialiased"
        style={{
          background: "transparent",
          color: "var(--foreground)",
          fontFamily: "var(--font-outfit), Outfit, sans-serif",
        }}
      >
        <PwaRegistrar />
        <AuthProvider>
          <SiteShell>{children}</SiteShell>
        </AuthProvider>
      </body>
    </html>
  );
}
